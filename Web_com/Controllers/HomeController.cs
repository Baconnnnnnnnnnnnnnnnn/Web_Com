using System;
using System.Linq;
using System.Web.Mvc;
using Web_com.Models.Entities;

namespace Web_com.Controllers
{
    public class HomeController : Controller
    {
        private web_comEntities db = new web_comEntities();

        public ActionResult Web_Com()
        {
            return View();
        }

        public ActionResult Index()
        {
            var works = db.works.ToList();
            return View(works);
        }
    }
}