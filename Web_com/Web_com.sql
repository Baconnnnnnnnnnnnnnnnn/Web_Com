use master 
go

drop database if exists web_com
create database web_com
go

use web_com
go


--Phân quyền admin
drop table if exists role_Admin
create table role_Admin
(
	role_AdminId int primary key identity,
	role_AdminName varchar(50),
)
go

insert into role_Admin
values ('Super'), ('Account'), ('Content'), ('Comment'), ('Complain')
go

--Danh sách admin
drop table if exists admins
create table admins
(
	adminsId int primary key identity,
	adminsName varchar(50),
	adminsEmail varchar(50),
	adminsPass varchar(50),
	role_AdminId int foreign key references role_Admin(role_AdminId),
)
go

insert into admins
values
('SuperAdmin', 'SuperAdmin@gmail.com', '123', 1),
('AccountAdmin', 'AccountAdmin@gmail.com', '123', 2),
('ContentAdmin', 'ContentAdmin@gmail.com', '123', 3),
('CommentAdmin', 'CommentAdmin@gmail.com', '123', 4),
('ComplainAdmin', 'ComplainAdmin@gmail.com', '123', 5)
go

--Danh sách tài khoản (vừa người đọc vừa tác giả)
drop table if exists users
create table users
(
	usersId int primary key identity,
	usersName varchar(50) unique,
	usersEmail varchar(50),
	usersPass varchar(50),
	usersCreated datetime default getDate(),
	usersAvatar varchar(500),
	usersCover varchar(500),
	isAuthor bit default 0, -- Nếu họ có đăng truyện
	isDisabled bit default 0 -- Nếu họ có vi phạm
)
go

insert into users (usersName, usersEmail, usersPass, isAuthor)
values
('AA', 'AA@gmail.com', '123', 1),
('BB', 'BB@gmail.com', '123', 1),
('CC', 'CC@gmail.com', '123', 1),
('DD', 'DD@gmail.com', '123', 1)
go

--Thể loại đọc
drop table if exists genre
create table genre
(
	genreId int primary key identity,
	genreName varchar(50),
)
go

insert into genre
values ('Manga'), ('Light Novel')
go

--Nội dung đọc
drop table if exists tag
create table tag
(
	tagId int primary key identity,
	tagName varchar(50) unique,
)
go

insert into tag
values ('Shounen'), ('Romance'), ('Isekai'), ('Harem'), ('Slice of Life'), ('Fantasy'), ('Comedy')
go

--Tình trạng tác phẩm
drop table if exists work_Status
create table work_Status
(
	work_StatusId int primary key identity,
    work_StatusName varchar(50)
)
go

insert into work_Status
values ('Upcoming'), ('Ongoing'), ('End'), ('Pause'), ('Dead')
go

--Tác phẩm
drop table if exists work
create table work
(
	workId int primary key identity,
	workName varchar(500),
	workCreated datetime default getDate(),
	workImage varchar(500),
	workOverview varchar(max),
	genreId int foreign key references genre(genreId),
	authorId int foreign key references users(usersId),
	work_StatusId int foreign key references work_Status(work_StatusId),
	isDisabled bit default 0
)
go

insert into work (workName, workImage, genreId, authorId, work_StatusId)
values
('The Angel Next Door Spoils Me Rotten', 'Mahiru-bg.png', 1, 1, 2),
('Wandering Witch: The Journey of Elaina', 'Elaina-bg.png', 2, 2, 2),
('Alya Sometimes Hides Her Feelings in Russia', 'Alya-bg.png', 2, 2, 1),
('The Quintessential Quintuplets', 'Gotoubun-bg.png', 1, 2, 1),
('Rascal Does Not Dream', 'Aobuta-bg.png', 2, 3, 4),
('Fly Me To The Moon', 'Tonikaku-bg.png', 1, 3, 5),
('Date a Live', 'DAL-bg.png', 2, 3, 3)
go

--Nội dung tác phẩm
drop table if exists work_Tag
create table work_Tag
(
	work_TagId int primary key identity,
	workId int foreign key references work(workId),
    tagId int foreign key references tag(tagId),
    unique (workId, tagId) -- Tránh trùng gán tag
)
go

--Arc tác phẩm
drop table if exists work_Arc
create table work_Arc
(
	work_ArcId int primary key identity,
	work_ArcTitle varchar(100),
    work_ArcOrder int, -- Thứ tự arc
    work_Id int foreign key references work(workId)
)
go


--Mẫu Elaina
insert into work_Arc
values 
('Arc 1', 1, 2),
('Arc 2', 2, 2)
go

--Chapter tác phẩm
drop table if exists work_Chapter
create table work_Chapter
(
	work_ChapterId int primary key identity,
    work_ChapterTitle varchar(100),
    work_ChapterContent varchar(max), -- Chỉ dùng cho light novel
    work_ChapterOrder int,
    work_ChapterIsImage bit default 0, -- 1 nếu là Manga, 0 nếu là Light Novel
	work_ArcId int foreign key references work_Arc(work_ArcId)
)
go

--Mẫu Elaina
insert into work_Chapter
values 
('The Country of Mages', 'Chapter 1' ,1, 0, 6),
('A Girl as Sweet as Flowers', 'Chapter 2', 2, 0, 6),
('On the Road: The Tale of a Muscleman Searching for His Little Sister', 'Chapter 3', 3, 0, 6),
('Fun-Raising', 'Chapter 4', 4, 0, 6),
('On the Road: The Tale of Two Men Who Couldnt Settle a Contest', 'Chapter 5', 5, 0, 6),
('Prologue', 'Chapter 1', 1, 0, 7)
go

--Chapter cho Manga
drop table if exists work_ChapterImage
create table work_ChapterImage (
    work_ChapterImageId int primary key identity,
	work_ChapterImageName varchar(500),
    work_ChapterImageOrder int,
    work_ChapterId int foreign key references work_Chapter(work_ChapterId)
)
go

--Mẫu cho Gotoubun
insert into work_ChapterImage
values 
('Chapter 1-1', 1 ,17),
('Chapter 1-2', 2 ,17),
('Chapter 1-3', 3 ,17),
('Chapter 1-4', 4 ,17),
('Chapter 1-5', 5 ,17),
('Chapter 1-6', 6 ,17)
go

--View tác phẩm
drop table if exists work_View
create table work_View
(
	work_ViewId int primary key identity,
	work_ViewDate datetime default getDate(),
    workId int foreign key references work(workId),
    usersId int null foreign key references users(usersId)
)
go

--Thả tim tác phẩm
drop table if exists work_Heart
create table work_Heart
(
	work_HeartId int primary key identity,
	userId int foreign key references users(usersId),
    workId int foreign key references work(workId),
    unique (userId, workId)
)
go

--Theo dõi tác phẩm
drop table if exists work_Favorite
create table work_Favorite
(
	work_FavoriteId int primary key identity,
	userId int foreign key references users(usersId),
    workId int foreign key references work(workId),
    unique (userId, workId)
)
go

--Bình luận tác phẩm
drop table if exists work_Comment
create table work_Comment
(
	work_CommentId int primary key identity,
	work_CommentContent varchar(max),
    work_CommentCreated datetime default getDate(),
	work_CommentIsApproved bit default 0,
    work_CommentIsDeleted bit default 0,
    workId int foreign key references work(workId),
    userId int foreign key references users(usersId),
	arcId INT NULL REFERENCES work_Arc(work_ArcId),
    chapterId INT NULL REFERENCES work_Chapter(work_ChapterId)
)
go

--Thả tim cho bình luận
drop table if exists comment_Heart
create table comment_Heart
(
	comment_HeartId int primary key identity,
	usersId int foreign key references users(usersId),
    work_CommentId int foreign key references work_Comment(work_CommentId),
    unique (usersId, work_CommentId)
)
go

--Theo dõi tác giả
drop table if exists author_Follow
create table author_Follow
(
	author_FollowId int primary key identity,
	followerId int foreign key references users(usersId),
    authorId int foreign key references users(usersId),
    unique (followerId, authorId),
    check (followerId <> authorId)
)
go

--Nội dung thành tựu (khi đạt mốc nhất định, cho người đọc lẫn tác giả)
drop table if exists badge
create table badge
(
	badgeId int primary key identity,
    badgeName varchar(100),
    badgeDescription varchar(500),
    isForAuthor bit default 0, -- 1 = tác giả, 0 = người đọc
)
go

--Người nhận thành tựu
drop table if exists user_Badge
create table user_Badge
(
	userId int foreign key references users(usersId),
    badgeId int foreign key references badge(badgeId),
    user_BadgeObtained datetime default getDate(),
    primary key (userId, badgeId)
)
go

--Cảnh cáo vi phạm (cho người đọc)
drop table if exists user_Warning
create table user_Warning
(
	user_WarningId int primary key identity,
	user_WarningType varchar(50), -- Tùy vào lỗi vi phạm
	user_WarningReason varchar(255),
	user_WarningLevel int, -- 1, 2, 3: theo mức cảnh cáo
	user_WarningDate datetime default getDate(),
    userId int foreign key references users(usersId),
)  
go

--Lịch sử đã đọc của người dùng
drop table if exists user_History;
create table user_History (
    userId int foreign key references users(usersId),
    workId int foreign key references work(workId),
    arcId int foreign key references work_Arc(work_ArcId),
    chapterId int foreign key references work_Chapter(work_ChapterId),
    user_HistoryReadTime datetime default getDate(),
    primary key (userId, chapterId) -- Mỗi người chỉ đọc 1 lần mỗi chương
);
go

--Cảnh báo vi phạm (cho tác giả)
drop table if exists author_Warning
create table author_Warning
(
	author_WarningId int primary key identity,
	author_WarningReason varchar(255),
	author_WarningWorkId int foreign key references work(workId),
	author_WarningDate datetime default getDate(),
    authorId int foreign key references users(usersId),
)  
go

--Câu truy vấn tìm top 5 tác phẩm có
--View cao nhất, tim nhiều nhất và đăng gần đây
select 
    w.workId,
    w.workName,
    count(distinct wh.userId) as heartCount,
    count(distinct wv.work_ViewId) as viewCount,
    w.workCreated
from work w
left join work_Heart wh on w.workId = wh.workId
left join work_View wv on w.workId = wv.workId
group by w.workId, w.workName, w.workCreated
order by heartCount desc, viewCount desc, w.workCreated desc
OFFSET 0 rows fetch next 5 rows only


--Câu truy vấn để người dùng biết số Manga lẫn Light novel đã đọc
select 
    u.usersName,
    count(case when g.genreName = 'Manga' then 1 end) as mangaRead,
    count(case when g.genreName = 'Light novel' then 1 end) as lightNovelRead
from users u
left join work_View wv on u.usersId = wv.usersId
left join work w on wv.workId = w.workId
left join genre g on w.genreId = g.genreId
group by u.usersName

--Mẫu Arc và Chapter
--Id 1
insert into work_Arc values 
('Arc 1', 1, 1),
('Arc 2', 2, 1)
go

insert into work_Chapter values
('A Rainy Day', 'Chapter 1', 1, 1, 8),
('Lunchbox Promise', 'Chapter 2', 2, 1, 8),
('The Warmth of an Umbrella', 'Chapter 3', 3, 1, 8),
('Christmas Surprise', 'Chapter 4', 4, 1, 8),
('New Year’s Resolution', 'Chapter 5', 5, 1, 9)
go

--Id 3
insert into work_Arc values 
('Arc 1', 1, 3),
('Arc 2', 2, 3)
go

insert into work_Chapter values
('Snowy Encounter', 'Chapter 1', 1, 0, 10),
('The Blushing Senpai', 'Chapter 2', 2, 0, 10),
('Behind the Library', 'Chapter 3', 3, 0, 10),
('Shared Umbrella', 'Chapter 4', 4, 0, 10),
('Fireworks Festival', 'Chapter 5', 5, 0, 11)
go

--Id 4
insert into work_Arc values 
('Arc 1', 1, 4),
('Arc 2', 2, 4)
go

insert into work_Chapter values
('The New Tutor', 'Chapter 1', 1, 1, 12),
('A Difficult Start', 'Chapter 2', 2, 1, 12),
('Five Problems', 'Chapter 3', 3, 1, 12),
('Unexpected Visit', 'Chapter 4', 4, 1, 12),
('Study Camp Begins', 'Chapter 5', 5, 1, 13)
go

--Id 5
insert into work_Arc values 
('Arc 1', 1, 5),
('Arc 2', 2, 5)
go

insert into work_Chapter values
('Puberty Syndrome Begins', 'Chapter 1', 1, 0, 14),
('Invisible Girl', 'Chapter 2', 2, 0, 14),
('Same Time, Different Day', 'Chapter 3', 3, 0, 14),
('Looping Dilemma', 'Chapter 4', 4, 0, 14),
('Memory Disappears', 'Chapter 5', 5, 0, 15)
go

--Id 6
insert into work_Arc values 
('Arc 1', 1, 6),
('Arc 2', 2, 6)
go

insert into work_Chapter values
('Wedding Bells', 'Chapter 1', 1, 1, 16),
('First Night', 'Chapter 2', 2, 1, 16),
('Meeting the In-Laws', 'Chapter 3', 3, 1, 16),
('Late-Night Talks', 'Chapter 4', 4, 1, 16),
('Surprise Birthday', 'Chapter 5', 5, 1, 17)
go

--Id 7
insert into work_Arc values 
('Arc 1', 1, 7),
('Arc 2', 2, 7)
go

insert into work_Chapter values
('The Spirit Appears', 'Chapter 1', 1, 0, 18),
('Operation Date!', 'Chapter 2', 2, 0, 18),
('Unstable Spirit', 'Chapter 3', 3, 0, 18),
('School Life Chaos', 'Chapter 4', 4, 0, 18),
('A Date to Save the World', 'Chapter 5', 5, 0, 19)
go

-- The Angel Next Door Spoils Me Rotten (ID = 1)
update work set workOverview = 
'Mahiru Shiina, known as the Angel of her school, lives a seemingly perfect life. But after a rainy encounter with her neighbor Amane, walls begin to fall and hearts begin to change. A sweet and slow romance unfolds as two lonely souls discover warmth in each other'
where workId = 1;

-- Wandering Witch (ID = 2)
update work set workOverview = 
'Elaina is a witch who travels freely across fantastical lands, meeting strange people and witnessing both wonder and tragedy. Her journey is one of curiosity, reflection, and the bittersweet stories left behind in each place she visits'
where workId = 2;

-- Alya Sometimes Hides Her Feelings in Russia (ID = 3)
update work set workOverview = 
'Alisa Mikhailovna Kujou, a beautiful and icy transfer student from Russia, hides her true emotions behind sharp words—except when she slips into her native tongue. Her flustered senpai just might be the only one who can truly understand her heart'
where workId = 3;

-- The Quintessential Quintuplets (ID = 4)
update work set workOverview = 
'Fuutarou Uesugi is a top student who becomes the private tutor for five identical quintuplet sisters, each with wildly different personalities and zero academic motivation. Love, laughter, and chaos ensue in this heartwarming harem comedy'
where workId = 4;

-- Rascal Does Not Dream (ID = 5)
update work set workOverview = 
'Adolescence Syndrome causes bizarre phenomena among teenagers. Sakuta Azusagawa meets girls afflicted with strange conditions, including a famous actress who suddenly becomes invisible. A story of mystery, love, and the invisible pain of growing up'
where workId = 5;

-- Fly Me To The Moon (ID = 6)
update work set workOverview = 
'After a near-death accident, Nasa Yuzaki proposes to a mysterious girl named Tsukasa. She agrees—on one condition: they must marry first. Thus begins an unusual and charming married life full of sweet, hilarious, and heartwarming moments'
where workId = 6;

-- Date a Live (ID = 7)
update work set workOverview = 
'The fate of the world depends on one awkward high schooler: Shido Itsuka. To stop mysterious beings called Spirits from destroying humanity, he must date them—and make them fall in love. A wild mix of action, romance, and cosmic-scale stakes'
where workId = 7;


SELECT workId, workName, work_ChapterContent 
FROM work 
WHERE workId = 7; 

update work_Chapter set work_ChapterContent = 'A strange phenomenon occurs in the sky, signaling the appearance of a new Spirit. Shido Itsuka is about to be dragged into a world-changing encounter.' where work_ChapterTitle = 'The Nameless Girl';

update work_Chapter set work_ChapterContent = 
'Part 1 
"Ahhh…"
There is nothing worse than being woken up from your sleep.
Well, you open your eyes, and find your sister passionately sambaing on top of you – is anyone happy?
Monday, April 10.
Rubbing his eyes, Shidou spoke in a soft voice.
"Ahh, Kotori. My cute little sister."
"A!"
Only then did she realize that her brother had woken up. The little sister with one foot on Shidou''s stomach – Kotori, turned around and adjusted her uniform.
Her long twintailed hair swayed as Kotori stared at Shidou with her large, round, chestnut-like eyes.
Even though she was caught jumping on her brother, she didn''t mumble curses like someone who was caught doing something bad. Perhaps, she was truly happy that Shidou had woken up.
And Shidou had a very nice view – what caught his eye was Kotori''s panties.
It''s not just ''showing off''. There''s a limit to everything.
"What is it? My cute brother!"
Kotori replied – still keeping her foot on his stomach.
At the party, Shidou isn''t ''cute'' at all.
"Get out. You''re too heavy."
Kotori nodded her head, and jumped out of bed.
"Ugh!"
"Ahahaha, ''ugh''! Ahahahaha!"
"…"
Shidou said nothing, just pulled the blanket over his head.
"Ahh! Hey~! Why are you still sleeping!"
Kotori raised her voice, and shook him.
"Just ten more minutes…"
"No way~! Get up!"
Shidou sat up, stiff from being shaken by Kotori, then let out a long yawn.
"R—Run…"' 
where work_ChapterTitle = 'The Nameless Girl';
