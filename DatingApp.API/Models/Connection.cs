namespace DatingApp.API.Models
{
    public class Connection
    {
        public Connection()
        {
        }

        public Connection(string connectionId, string username, int userId)
        {
            ConnectionId = connectionId;
            Username = username;
            UserId = userId;
        }

        public string ConnectionId { get; set; }
        public string Username { get; set; }
        public int UserId { get; set; }
    }
}