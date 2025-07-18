using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Web_com.Models.ModelView
{
    public class CommentAdminViewModel
    {
        public int Work_CommentId { get; set; }
        public string UserName { get; set; }
        public string UserAvatar { get; set; }
        public string Work_CommentContent { get; set; }
        public DateTime Work_CommentCreated { get; set; }
        public int HeartCount { get; set; }
        public string WorkName { get; set; }
        public bool IsApproved { get; set; }
        public bool IsDeleted { get; set; }
    }
}