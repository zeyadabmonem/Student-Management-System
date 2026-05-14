using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudentManagementSystem.Data;
using StudentManagementSystem.Models;

namespace StudentManagementSystem.Controllers
{
    /// <summary>
    /// This controller handles all CRUD operations for the Student entity.
    /// [Authorize] ensures that only users with a valid JWT token can access these endpoints.
    /// </summary>
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class StudentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        // The constructor injects the database context so we can interact with the database.
        public StudentsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Students
        // Retrieves a list of all students from the database.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Student>>> GetStudents()
        {
            return await _context.Students.ToListAsync();
        }

        // GET: api/Students/5
        // Retrieves a single student by their unique ID.
        [HttpGet("{id}")]
        public async Task<ActionResult<Student>> GetStudent(int id)
        {
            var student = await _context.Students.FindAsync(id);

            if (student == null)
                return NotFound();

            return student;
        }

        // POST: api/Students
        // Creates a new student record.
        [HttpPost]
        public async Task<ActionResult<Student>> PostStudent(Student student)
        {
            _context.Students.Add(student);
            await _context.SaveChangesAsync();

            // Returns a 201 Created response with the location of the new resource.
            return CreatedAtAction(nameof(GetStudent), new { id = student.Id }, student);
        }

        // PUT: api/Students/5
        // Updates an existing student record.
        [HttpPut("{id}")]
        public async Task<IActionResult> PutStudent(int id, Student student)
        {
            // Ensure the ID in the URL matches the ID in the object body.
            if (id != student.Id)
                return BadRequest();

            // Mark the entity as modified so Entity Framework knows to update it.
            _context.Entry(student).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!StudentExists(id))
                    return NotFound();
                else
                    throw;
            }

            return NoContent(); // 204 No Content is standard for successful updates.
        }

        // DELETE: api/Students/5
        // Removes a student record from the database.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStudent(int id)
        {
            var student = await _context.Students.FindAsync(id);
            if (student == null)
                return NotFound();

            _context.Students.Remove(student);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Helper method to check if a student exists in the database.
        private bool StudentExists(int id)
        {
            return _context.Students.Any(e => e.Id == id);
        }
    }
}

