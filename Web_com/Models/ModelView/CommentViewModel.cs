using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Web_com.Models.ModelView
{
    public class CommentViewModel
    {
        public int Work_CommentId { get; set; }
        public string Work_CommentContent { get; set; }
        public DateTime Work_CommentCreated { get; set; } // Giữ nguyên kiểu DateTime
        public string UserName { get; set; }
        public string UserAvatar { get; set; }
        public bool IsApproved { get; set; }
        public int HeartCount { get; set; } 
        public bool HasHearted { get; set; } 

        // Thêm property chỉ để hiển thị (không ánh xạ từ DB)
        public string FormattedWorkCommentCreated
        {
            get { return Work_CommentCreated.ToString("dd/MM/yyyy"); }
        }
    }
}