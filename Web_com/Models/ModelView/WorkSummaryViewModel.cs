using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Web_com.Models.ModelView
{
    public class WorkSummaryViewModel
    {
        public int WorkId { get; set; }
        public string WorkName { get; set; }
        public string WorkImage { get; set; }
        public string GenreName { get; set; }
        public List<string> TagNames { get; set; }
        public string StatusName { get; set; }
        public string AuthorName { get; set; }
        public bool? IsDisabled { get; set; }
    }
}