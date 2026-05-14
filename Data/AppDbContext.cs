using Microsoft.EntityFrameworkCore;
using StudentManagementSystem.Models;

namespace StudentManagementSystem.Data
{
    /// <summary>
    /// The AppDbContext class acts as a bridge between your C# code and the database.
    /// It handles querying, saving, and managing entity configurations.
    /// </summary>
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // Each DbSet represents a table in the database.
        public DbSet<Student> Students { get; set; }
        public DbSet<User> Users { get; set; }

        // This method is used to configure the database model and seed initial data.
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Seed a default admin user so you can log in immediately after setup.
            modelBuilder.Entity<User>().HasData(new User
            {
                Id = 1,
                Username = "admin",
                Password = "password123" // In a real app, use a hashed password.
            });
        }
    }
}

