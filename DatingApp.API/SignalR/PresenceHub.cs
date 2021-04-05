using System;
using System.Threading.Tasks;
using DatingApp.API.Extensions;
using DatingApp.API.Helpers;
using Microsoft.AspNetCore.SignalR;

// Microsoft do not provide a way to track who is connected. Why?
// No way to get connection from other server in web farms with multiple web servers
// A scalable option would be to add Redis, where db information can be distributed across servers
// Or store the information in the db
// For now, we will use a dictionary (will only work on single server)
namespace DatingApp.API.SignalR
{
    public class PresenceHub : Hub
    {
        private readonly PresenceTracker _tracker;

        public PresenceHub(PresenceTracker tracker)
        {
            _tracker = tracker;
        }

        public override async Task OnConnectedAsync()
        {
            await _tracker.UserConnected(Context.User.GetUsername().ToString(), Context.ConnectionId);
            await Clients.Others.SendAsync("UserIsOnline", Context.User.GetUsername().FirstCharToUpper());

            var currentUsers = await _tracker.GetOnlineUsers();
            await Clients.All.SendAsync("GetOnlineUsers", currentUsers);
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            await _tracker.UserDisconnected(Context.User.GetUsername(), Context.ConnectionId);
            await Clients.Others.SendAsync("UserIsOffline", Context.User.GetUsername().FirstCharToUpper());

            var currentUsers = await _tracker.GetOnlineUsers();
            await Clients.All.SendAsync("GetOnlineUsers", currentUsers);

            await base.OnDisconnectedAsync(exception);
        }
    }
}