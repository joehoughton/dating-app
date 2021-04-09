using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using AutoMapper;
using DatingApp.API.Data;
using DatingApp.API.Dtos;
using DatingApp.API.Extensions;
using DatingApp.API.Models;
using Microsoft.AspNetCore.SignalR;

namespace DatingApp.API.SignalR
{
    ///<summary>
    /// Stores users actively messaging one other in groups e.g. bruce-lola
    ///</summary>
    public class MessageHub : Hub
    {
        private readonly IDatingRepository _repo;
        private readonly IMapper _mapper;
        private readonly PresenceTracker _tracker;
        private readonly IHubContext<PresenceHub> _presenceHub;

        public MessageHub(IDatingRepository repo, IMapper mapper, IHubContext<PresenceHub> presenceHub, PresenceTracker tracker)
        {
            _presenceHub = presenceHub;
            _tracker = tracker;
            _repo = repo;
            _mapper = mapper;
        }

        public override async Task OnConnectedAsync()
        {
            var httpContect = Context.GetHttpContext();
            var recipientId = int.Parse(httpContect.Request.Query["recipientId"].ToString());
            var otherUser = await _repo.GetUser(recipientId);

            var groupName = GetGroupName(Context.User.GetUsername(), otherUser.Username);
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            var group = await AddToGroup(groupName);
            await Clients.Group(groupName).SendAsync("UpdatedGroup", group); // if group is empty, SignalR doesn't send

            var messageFromRepo = await _repo.GetMessageThread(Context.User.GetUserId(), recipientId);
            var messageThread = _mapper.Map<IEnumerable<MessageToReturnDto>>(messageFromRepo);

            await Clients.Caller.SendAsync("ReceiveMessageThread", messageThread);
        }

        public override async Task OnDisconnectedAsync(Exception exception) // TODO: Remove rest of connections?
        {
            var group = await RemoveFromMessageGroup();
            await Clients.Group(group.Name).SendAsync("UpdatedGroup", group);
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// WebSockets do not use HTTP and thus HTTP exceptions cannot be used
        /// </summary>
        public async Task SendMessage(MessageForCreationDto messageForCreationDto)
        {
            var userId = Context.User.GetUserId();

            var sender = await _repo.GetUser(userId);
            messageForCreationDto.SenderId = userId;

            var recipient = await _repo.GetUser(messageForCreationDto.RecipientId);

            if (recipient == null)
                throw new HubException("Could not find user");

            var message = _mapper.Map<Message>(messageForCreationDto);

            var groupName = GetGroupName(sender.Username, recipient.Username);
            var group = await _repo.GetMessageGroup(groupName);

            if (group.Connections.Any(x => x.Username == recipient.Username))
            {
                message.IsRead = true;
                message.DateRead = DateTime.UtcNow;
            }
            else
            {
                var connections = await _tracker.GetConnectionsForUser(recipient.Username);
                if (connections != null)
                {
                    await _presenceHub.Clients.Clients(connections).SendAsync("NewMessageReceived", new { id = sender.Id, knownAs = sender.KnownAs });
                }
            }

            _repo.Add(message);

            if (await _repo.SaveAll())
            {
                await Clients.Group(groupName).SendAsync("NewMessage", _mapper.Map<MessageToReturnDto>(message));
            }
        }

        private string GetGroupName(string caller, string other)
        {
            var stringCompare = string.CompareOrdinal(caller, other) < 0;

            return stringCompare ? $"{caller}-{other}" : $"{other}-{caller}";
        }

        /// <summary>
        /// HubCallerContext gives us access to current user name and connection id
        /// </summary>
        private async Task<Group> AddToGroup(string groupName)
        {
            var group = await _repo.GetMessageGroup(groupName);
            var connection = new Connection(Context.ConnectionId, Context.User.GetUsername());

            if (group == null)
            {
                group = new Group(groupName);
                _repo.AddGroup(group);
            }

            group.Connections.Add(connection);

            if (await _repo.SaveAll()) return group;

            throw new HubException("Failed to join group");
        }

        private async Task<Group> RemoveFromMessageGroup()
        {
            var group = await _repo.GetGroupForConnection(Context.ConnectionId);
            var connection = group.Connections.FirstOrDefault(x => x.ConnectionId == Context.ConnectionId);
            _repo.RemoveConnection(connection);

            if (await _repo.SaveAll()) return group;

            throw new HubException("Failed to remove from group");
        }
    }
}