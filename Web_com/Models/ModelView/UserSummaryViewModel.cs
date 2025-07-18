using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Web_com.Models.ModelView
{
    public class UserSummaryViewModel
    {
        public int UsersId { get; set; }
        public string UsersName { get; set; }
        public string UsersEmail { get; set; }
        public string UsersPass { get; set; }
        public DateTime? UsersCreated { get; set; }
        public string UsersAvatar { get; set; }
        public string UsersCover { get; set; }
        public bool? IsAuthor { get; set; }
        public bool? IsDisabled { get; set; }
    }
}
