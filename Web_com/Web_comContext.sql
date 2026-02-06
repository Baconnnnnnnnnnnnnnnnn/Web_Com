--Mẫu role admin
insert into role_Admin
values ('Super'), ('Account'), ('Content'), ('Comment'), ('Complain')
go

--Mẫu tài khoản admin
insert into admins
values
('SuperAdmin', 'SuperAdmin@gmail.com', '123', 1),
('AccountAdmin', 'AccountAdmin@gmail.com', '123', 2),
('ContentAdmin', 'ContentAdmin@gmail.com', '123', 3),
('CommentAdmin', 'CommentAdmin@gmail.com', '123', 4),
('ComplainAdmin', 'ComplainAdmin@gmail.com', '123', 5)
go

--Mẫu tài khoản người dùng
insert into users (usersName, usersEmail, usersPass, isAuthor)
values
('AA', 'AA@gmail.com', '123', 1),
('BB', 'BB@gmail.com', '123', 1),
('CC', 'CC@gmail.com', '123', 1),
('DD', 'DD@gmail.com', '123', 1)
go

--Mẫu thể loại truyện
insert into genre
values ('Manga'), ('Light Novel')
go

--Mẫu tag truyện
insert into tag
values ('Shounen'), ('Romance'), ('Isekai'), ('Harem'), ('Slice of Life'), ('Fantasy'), ('Comedy')
go

--Mẫu trạng thái truyện
insert into work_Status
values ('Upcoming'), ('Ongoing'), ('End'), ('Pause'), ('Dead')
go

--Mẫu truyện từ người dùng
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

--Mẫu Elaina
insert into work_Arc
values 
('Arc 1', 1, 2),
('Arc 2', 2, 2)
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