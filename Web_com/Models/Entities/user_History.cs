//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated from a template.
//
//     Manual changes to this file may cause unexpected behavior in your application.
//     Manual changes to this file will be overwritten if the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

namespace Web_com.Models.Entities
{
    using System;
    using System.Collections.Generic;
    
    public partial class user_History
    {
        public int userId { get; set; }
        public Nullable<int> workId { get; set; }
        public Nullable<int> arcId { get; set; }
        public int chapterId { get; set; }
        public Nullable<System.DateTime> user_HistoryReadTime { get; set; }
    
        public virtual work_Arc work_Arc { get; set; }
        public virtual work_Chapter work_Chapter { get; set; }
        public virtual user user { get; set; }
        public virtual work work { get; set; }
    }
}
