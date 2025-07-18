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
    
    public partial class work_Chapter
    {
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2214:DoNotCallOverridableMethodsInConstructors")]
        public work_Chapter()
        {
            this.user_History = new HashSet<user_History>();
            this.work_ChapterImage = new HashSet<work_ChapterImage>();
            this.work_Comment = new HashSet<work_Comment>();
        }
    
        public int work_ChapterId { get; set; }
        public string work_ChapterTitle { get; set; }
        public string work_ChapterContent { get; set; }
        public Nullable<int> work_ChapterOrder { get; set; }
        public Nullable<bool> work_ChapterIsImage { get; set; }
        public Nullable<int> work_ArcId { get; set; }
    
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2227:CollectionPropertiesShouldBeReadOnly")]
        public virtual ICollection<user_History> user_History { get; set; }
        public virtual work_Arc work_Arc { get; set; }
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2227:CollectionPropertiesShouldBeReadOnly")]
        public virtual ICollection<work_ChapterImage> work_ChapterImage { get; set; }
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Usage", "CA2227:CollectionPropertiesShouldBeReadOnly")]
        public virtual ICollection<work_Comment> work_Comment { get; set; }
    }
}
