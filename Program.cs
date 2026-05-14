using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StudentManagementSystem.Data;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// --- Services Configuration ---

builder.Services.AddControllers();

// Database: Configuring SQLite. 'Data Source=students.db' creates a file-based database in the project root.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=students.db"));

// Security: Configuring JWT (JSON Web Token) Authentication.
// We use a hardcoded key here for simplicity, but in production, this should be in appsettings.json or a secret manager.
var key = Encoding.ASCII.GetBytes("YourSuperSecretKeyGoesHere1234567890");
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false; // Disable for local development
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false, // We skip these for this simple demo
        ValidateAudience = false
    };
});

builder.Services.AddOpenApi();

var app = builder.Build();

// --- Database Automation ---
// This block ensures the database and tables are created automatically when the app starts.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// --- Middleware Pipeline ---

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Enable Static Files: This allows the server to serve index.html, CSS, and JS from the 'wwwroot' folder.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication(); // Check if the user has a valid token
app.UseAuthorization();  // Check if the user has permission to access the resource

app.MapControllers();

app.Run();


