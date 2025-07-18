using System;
using System.Collections.Generic;
using Web_com.Models.Entities;
using System.Linq;
using System.Web;

namespace Web_com.Models.ModelView
{
    public class WorkTagViewModel
    {
        public List<work> Works { get; set; }
        public List<tag> Tags { get; set; }
        public Dictionary<int, List<tag>> WorkTags { get; set; } // workId → danh sách tag hiện tại
    }

}