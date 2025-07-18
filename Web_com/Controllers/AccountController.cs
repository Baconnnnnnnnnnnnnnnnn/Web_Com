using System;
using System.Linq;
using System.Web.Mvc;
using Web_com.Models.Entities;

namespace Web_com.Controllers
{
    public class AccountController : Controller
    {
        private web_comEntities db = new web_comEntities();

        public ActionResult Login()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Login(string usersEmail, string usersPass)
        {
            var user = db.users.FirstOrDefault(u => u.usersEmail == usersEmail && u.usersPass == usersPass);
            if (user != null)
            {
                Session["UserId"] = user.usersId;
                Session["UserName"] = user.usersName;
                return RedirectToAction("Login", "Web_Com");
            }
            ViewBag.ErrorMessage = "Invalid email or password!";
            return View();
        }

        [HttpPost]
        public JsonResult LoginAjax(string usersEmail, string usersPass)
        {
            try
            {
                System.Diagnostics.Debug.WriteLine($"LoginAjax: Email={usersEmail}");
                var user = db.users.FirstOrDefault(u => u.usersEmail == usersEmail && u.usersPass == usersPass);

                if (user != null)
                {
                    // ⚠ Kiểm tra tài khoản bị vô hiệu hóa
                    if (user.isDisabled == true)
                    {
                        return Json(new { success = false, message = "Account is disabled" });
                    }

                    Session["UserId"] = user.usersId;
                    Session["UserName"] = user.usersName;
                    return Json(new
                    {
                        success = true,
                        message = "Login successful!",
                        userId = user.usersId 
                    });
                }

                return Json(new { success = false, message = "Invalid email or password!" });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"LoginAjax error: {ex.Message}");
                return Json(new { success = false, message = "Server error occurred." });
            }
        }

        public ActionResult Guest()
        {
            Session["IsGuest"] = true;
            Session["UserName"] = null;
            Session["UserId"] = null;
            return RedirectToAction("Guest", "Web_Com");
        }

        public ActionResult Logout()
        {
            Session.Clear();
            return RedirectToAction("Index", "Web_Com");
        }

        public ActionResult Register()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public JsonResult RegisterAjax(string usersName, string usersEmail, string usersPass)
        {
            try
            {
                System.Diagnostics.Debug.WriteLine($"RegisterAjax: usersName={usersName}, usersEmail={usersEmail}");
                // Kiểm tra trống
                if (string.IsNullOrEmpty(usersName))
                    return Json(new { success = false, message = "Username cannot be empty!" });
                if (string.IsNullOrEmpty(usersEmail))
                    return Json(new { success = false, message = "Email cannot be empty!" });
                if (string.IsNullOrEmpty(usersPass))
                    return Json(new { success = false, message = "Password cannot be empty!" });

                // Kiểm tra trùng tên
                if (db.users.Any(u => u.usersName == usersName))
                    return Json(new { success = false, message = "Username already exists!" });

                // Kiểm tra trùng email
                if (db.users.Any(u => u.usersEmail == usersEmail))
                    return Json(new { success = false, message = "Email already registered!" });

                // Tạo user mới
                var newUser = new user
                {
                    usersName = usersName,
                    usersEmail = usersEmail,
                    usersPass = usersPass,
                    usersCreated = DateTime.Now,
                    usersAvatar = "DefaultAvatar.png", 
                    usersCover = "DefaultCover.png", 
                    isAuthor = false,
                    isDisabled = false
                };

                db.users.Add(newUser);
                int rowsAffected = db.SaveChanges();
                System.Diagnostics.Debug.WriteLine($"SaveChanges affected {rowsAffected} rows");

                // Set session
                Session["UserId"] = newUser.usersId;
                Session["UserName"] = newUser.usersName;

                return Json(new
                {
                    success = true,
                    message = "Registration successful!",
                    userName = newUser.usersName,
                    userId = newUser.usersId // Thêm dòng này
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"RegisterAjax error: {ex.Message}\n{ex.StackTrace}");
                return Json(new
                {
                    success = false,
                    message = "Registration failed. Please try again later. Error: " + ex.Message
                });
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}