using System;
using System.Linq;
using System.Web.Mvc;
using Web_com.Models.Entities;
using Web_com.Helpers;

namespace Web_com.Controllers
{
    public class AccountController : Controller
    {
        private web_comEntities db = new web_comEntities();

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Login(string usersEmail, string usersPass)
        {
            if (string.IsNullOrWhiteSpace(usersEmail) || string.IsNullOrWhiteSpace(usersPass))
            {
                ViewBag.ErrorMessage = "Email and password are required.";
                return View();
            }

            // Kiểm tra admin trước
            var admin = db.admins
                .Include("role_Admin")
                .FirstOrDefault(a => a.adminsEmail == usersEmail);

            if (admin != null)
            {
                bool valid = false;

                if (PasswordHasher.IsLegacyPlainText(admin.adminsPass))
                {
                    if (admin.adminsPass == usersPass)
                    {
                        valid = true;
                        admin.adminsPass = PasswordHasher.Hash(usersPass);
                        db.SaveChanges();
                    }
                }
                else
                {
                    valid = PasswordHasher.Verify(usersPass, admin.adminsPass);
                }

                if (valid)
                {
                    Session["AdminId"] = admin.adminsId;
                    Session["AdminName"] = admin.adminsName;
                    Session["AdminEmail"] = admin.adminsEmail;
                    Session["AdminRoleId"] = admin.role_AdminId;
                    Session["AdminRoleName"] = admin.role_Admin.role_AdminName;
                    Session["IsAdmin"] = true;
                    Session["IsLoggedIn"] = true;

                    string controllerName = GetControllerByRole((int)admin.role_AdminId);
                    return RedirectToAction(controllerName, "Admin");
                }
            }

            // Kiểm tra user thường
            var user = db.users.FirstOrDefault(u => u.usersEmail == usersEmail);

            if (user != null)
            {
                bool valid = false;

                if (PasswordHasher.IsLegacyPlainText(user.usersPass))
                {
                    if (user.usersPass == usersPass)
                    {
                        valid = true;
                        user.usersPass = PasswordHasher.Hash(usersPass);
                        db.SaveChanges();
                    }
                }
                else
                {
                    valid = PasswordHasher.Verify(usersPass, user.usersPass);
                }

                if (valid)
                {
                    if (user.isDisabled == true)
                    {
                        ViewBag.ErrorMessage = "Account is disabled.";
                        return View();
                    }

                    Session["UserId"] = user.usersId;
                    Session["UserName"] = user.usersName;
                    Session["IsAdmin"] = false;
                    Session["IsLoggedIn"] = true;
                    return RedirectToAction("Index", "Web_Com");  // sửa từ "Login" thành "Index" cho hợp lý
                }
            }

            ViewBag.ErrorMessage = "Invalid email or password!";
            return View();
        }

        [HttpPost]
        public JsonResult LoginAjax(string usersEmail, string usersPass)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(usersEmail) || string.IsNullOrWhiteSpace(usersPass))
                    return Json(new { success = false, message = "Email and password are required." });

                // Kiểm tra admin
                var admin = db.admins
                    .Include("role_Admin")
                    .FirstOrDefault(a => a.adminsEmail == usersEmail);

                if (admin != null)
                {
                    bool valid = false;

                    if (PasswordHasher.IsLegacyPlainText(admin.adminsPass))
                    {
                        if (admin.adminsPass == usersPass)
                        {
                            valid = true;
                            admin.adminsPass = PasswordHasher.Hash(usersPass);
                            db.SaveChanges();
                        }
                    }
                    else
                    {
                        valid = PasswordHasher.Verify(usersPass, admin.adminsPass);
                    }

                    if (valid)
                    {
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
                }

                // Kiểm tra user
                var user = db.users.FirstOrDefault(u => u.usersEmail == usersEmail);

                if (user != null)
                {
                    bool valid = false;

                    if (PasswordHasher.IsLegacyPlainText(user.usersPass))
                    {
                        if (user.usersPass == usersPass)
                        {
                            valid = true;
                            user.usersPass = PasswordHasher.Hash(usersPass);
                            db.SaveChanges();
                        }
                    }
                    else
                    {
                        valid = PasswordHasher.Verify(usersPass, user.usersPass);
                    }

                    if (valid)
                    {
                        if (user.isDisabled == true)
                            return Json(new { success = false, message = "Account is disabled" });

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
                }

                return Json(new { success = false, message = "Invalid email or password!" });
            }
            catch (Exception ex)
            {
                // Giữ lại log lỗi thật, nhưng không hiển thị chi tiết cho client
                System.Diagnostics.Debug.WriteLine($"LoginAjax error: {ex.Message}");
                return Json(new { success = false, message = "Server error occurred." });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public JsonResult RegisterAjax(string usersName, string usersEmail, string usersPass)
        {
            try
            {
                if (string.IsNullOrEmpty(usersName))
                    return Json(new { success = false, message = "Username cannot be empty!" });
                if (string.IsNullOrEmpty(usersEmail))
                    return Json(new { success = false, message = "Email cannot be empty!" });
                if (string.IsNullOrEmpty(usersPass))
                    return Json(new { success = false, message = "Password cannot be empty!" });

                // Kiểm tra trùng
                if (db.users.Any(u => u.usersName == usersName) ||
                    db.admins.Any(a => a.adminsName == usersName))
                    return Json(new { success = false, message = "Username already exists!" });

                if (db.users.Any(u => u.usersEmail == usersEmail) ||
                    db.admins.Any(a => a.adminsEmail == usersEmail))
                    return Json(new { success = false, message = "Email already registered!" });

                // Hash mật khẩu trước khi lưu
                string hashedPassword = PasswordHasher.Hash(usersPass);

                var newUser = new user
                {
                    usersName = usersName,
                    usersEmail = usersEmail,
                    usersPass = hashedPassword,   // ← ĐÃ HASH
                    usersCreated = DateTime.Now,
                    usersAvatar = "DefaultAvatar.png",
                    usersCover = "DefaultCover.png",
                    isAuthor = false,
                    isDisabled = false
                };

                db.users.Add(newUser);
                db.SaveChanges();

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
                string detailedMessage = ex.Message;

                if (ex is System.Data.Entity.Validation.DbEntityValidationException valEx)
                {
                    var sb = new System.Text.StringBuilder("Validation errors:\n");
                    foreach (var eve in valEx.EntityValidationErrors)
                    {
                        foreach (var ve in eve.ValidationErrors)
                        {
                            sb.AppendLine($" - Property: {ve.PropertyName}, Error: {ve.ErrorMessage}");
                        }
                    }
                    detailedMessage += "\n" + sb.ToString();
                }

                System.Diagnostics.Debug.WriteLine($"RegisterAjax FAIL: {detailedMessage}\n{ex.StackTrace}");

                return Json(new
                {
                    success = false,
                    message = "Registration failed: " + detailedMessage
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