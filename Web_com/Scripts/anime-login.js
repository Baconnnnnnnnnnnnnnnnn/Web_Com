$(document).ready(function () {
    // Hiệu ứng khi focus vào input
    $('.anime-input').focus(function () {
        $(this).parent().find('i').css('color', '#ff6b6b');
    }).blur(function () {
        $(this).parent().find('i').css('color', '#aaa');
    });

    // Hiệu ứng khi submit form
    $('.anime-form').submit(function (e) {
        $('.anime-btn').html('<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...');
    });

    // Hiệu ứng hover cho nút
    $('.anime-btn').hover(
        function () {
            $(this).css('transform', 'translateY(-2px)');
        },
        function () {
            $(this).css('transform', 'translateY(0)');
        }
    );
});