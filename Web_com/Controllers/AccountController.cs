using System;
using System.Linq;
using System.Web.Mvc;
using System.Web.Security;
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
            // Kiểm tra admin trước
            var admin = db.admins
                .Include("role_Admin")
                .FirstOrDefault(a => a.adminsEmail == usersEmail && a.adminsPass == usersPass);

            if (admin != null)
            {
                // Lưu session cho admin
                Session["AdminId"] = admin.adminsId;
                Session["AdminName"] = admin.adminsName;
                Session["AdminEmail"] = admin.adminsEmail;
                Session["AdminRoleId"] = admin.role_AdminId;
                Session["AdminRoleName"] = admin.role_Admin.role_AdminName;
                Session["IsAdmin"] = true;
                Session["IsLoggedIn"] = true;

                // Redirect đến controller admin tương ứng
                string controllerName = GetControllerByRole((int)admin.role_AdminId);
                return RedirectToAction(controllerName, "Admin");
            }

            // Nếu không phải admin, kiểm tra user
            var user = db.users.FirstOrDefault(u => u.usersEmail == usersEmail && u.usersPass == usersPass);
            if (user != null)
            {
                Session["UserId"] = user.usersId;
                Session["UserName"] = user.usersName;
                Session["IsAdmin"] = false;
                Session["IsLoggedIn"] = true;
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

                // Kiểm tra admin trước
                var admin = db.admins
                    .Include("role_Admin")
                    .FirstOrDefault(a => a.adminsEmail == usersEmail && a.adminsPass == usersPass);

                if (admin != null)
                {
                    // Lưu session cho admin
                    Session["AdminId"] = admin.adminsId;
                    Session["AdminName"] = admin.adminsName;
                    Session["AdminEmail"] = admin.adminsEmail;
                    Session["AdminRoleId"] = admin.role_AdminId;
                    Session["AdminRoleName"] = admin.role_Admin.role_AdminName;
                    Session["IsAdmin"] = true;
                    Session["IsLoggedIn"] = true;

                    return Json(new
                    {
                        success = true,
                        isAdmin = true,
                        name = admin.adminsName,
                        role = admin.role_Admin.role_AdminName,
                        controller = GetControllerByRole((int)admin.role_AdminId),
                        message = $"Admin {admin.adminsName} has logged in"
                    });
                }

                // Nếu không phải admin, kiểm tra user
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
                    Session["IsAdmin"] = false;
                    Session["IsLoggedIn"] = true;

                    return Json(new
                    {
                        success = true,
                        isAdmin = false,
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
            Session["IsAdmin"] = false;
            return RedirectToAction("Guest", "Web_Com");
        }

        public ActionResult Logout()
        {
            Session.Clear();
            FormsAuthentication.SignOut();
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

                // Kiểm tra trùng tên (cả trong users và admins)
                if (db.users.Any(u => u.usersName == usersName) ||
                    db.admins.Any(a => a.adminsName == usersName))
                    return Json(new { success = false, message = "Username already exists!" });

                // Kiểm tra trùng email (cả trong users và admins)
                if (db.users.Any(u => u.usersEmail == usersEmail) ||
                    db.admins.Any(a => a.adminsEmail == usersEmail))
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
                Session["IsAdmin"] = false;
                Session["IsLoggedIn"] = true;

                return Json(new
                {
                    success = true,
                    message = "Registration successful!",
                    userName = newUser.usersName,
                    userId = newUser.usersId
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

        private string GetControllerByRole(int roleId)
        {
            switch (roleId)
            {
                case 1: return "SuperAdmin";    // Super
                case 2: return "AccountAdmin";  // Account
                case 3: return "ContentAdmin";  // Content
                case 4: return "CommentAdmin";  // Comment
                case 5: return "ComplainAdmin"; // Complain
                default: return "Home";
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