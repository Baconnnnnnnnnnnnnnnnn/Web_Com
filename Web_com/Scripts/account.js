$(document).ready(function () {
    if (typeof jQuery === 'undefined') {
        console.error('jQuery is not loaded');
        alert('jQuery is not loaded. Please check your internet connection or CDN.');
        return;
    }
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 is not loaded');
        alert('SweetAlert2 is not loaded. Please check your internet connection or CDN.');
        return;
    }

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });

    // Login Form Handler
    const loginForm = $("#loginForm");
    if (loginForm.length === 0) {
        console.error('Login form not found in DOM');
        alert('Login form not found. Please ensure the form ID is correct.');
        return;
    }

    loginForm.on('submit', function (e) {
        e.preventDefault();
        console.log('Login form submitted');

        var form = $(this);
        var submitBtn = form.find('button[type="submit"]');
        var originalBtnText = submitBtn.text();

        submitBtn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Checking...');

        var email = form.find('[name="usersEmail"]').val();
        var password = form.find('[name="usersPass"]').val();

        if (!email || !password) {
            console.error('Email or password is empty');
            Toast.fire({
                icon: 'error',
                title: '❌ Please enter both email and password'
            });
            submitBtn.prop('disabled', false).text(originalBtnText);
            return;
        }

        // Gửi AJAX request đến server để kiểm tra
        $.ajax({
            url: '/Account/LoginAjax',
            type: 'POST',
            data: {
                usersEmail: email,
                usersPass: password,
                __RequestVerificationToken: $('input[name="__RequestVerificationToken"]').val()
            },
            success: function (response) {
                console.log('Login response:', response);
                if (response && typeof response.success === 'boolean') {
                    if (response.success) {
                        Toast.fire({
                            icon: 'success',
                            title: '✅ ' + (response.message || 'Login successful!')
                        });

                        // Xử lý redirect dựa trên loại tài khoản
                        setTimeout(function () {
                            if (response.isAdmin) {
                                // Admin redirect
                                let targetUrl = '/Admin/' + response.controller;
                                if (response.controller === 'ContentAdmin') {
                                    targetUrl = '/ContentAdmin/ContentAdmin';
                                }
                                window.location.href = targetUrl;
                            } else {
                                // User redirect
                                window.location.href = '/Web_Com/Login/User' + (response.userId || '');
                            }
                        }, 1500);
                    } else {
                        if (response.message === 'Account is disabled') {
                            Toast.fire({
                                icon: 'error',
                                title: '❌ Account now disable, retry later'
                            });
                        } else {
                            Toast.fire({
                                icon: 'error',
                                title: '❌ ' + (response.message || 'Invalid email or password!')
                            });
                        }
                    }
                } else {
                    console.error('Invalid response format:', response);
                    Toast.fire({
                        icon: 'error',
                        title: '❌ Invalid server response. Please try again'
                    });
                }
            },
            error: function (xhr, status, error) {
                console.error('Login AJAX error:', status, error, xhr.responseText);
                Toast.fire({
                    icon: 'error',
                    title: '❌ Failed to connect to server. Please try again.'
                });
            },
            complete: function () {
                submitBtn.prop('disabled', false).text(originalBtnText);
            }
        });
    });

    // Register Form Handler
    const registerForm = $("#registerForm");
    if (registerForm.length === 0) {
        console.error('Register form not found in DOM');
        alert('Register form not found. Please ensure the form ID is correct');
        return;
    }

    registerForm.on('submit', function (e) {
        e.preventDefault();
        console.log('Register form submitted, preventing default');

        const form = $(this);
        const submitBtn = form.find('button[type="submit"]');
        const originalBtnText = submitBtn.text();

        submitBtn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Registering...');

        // Get form values
        const username = form.find('[name="usersName"]').val();
        const email = form.find('[name="usersEmail"]').val();
        const password = form.find('[name="usersPass"]').val();

        // Bỏ waifu field không gửi lên server
        const formData = {
            usersName: username,
            usersEmail: email,
            usersPass: password,
            __RequestVerificationToken: form.find('input[name="__RequestVerificationToken"]').val()
        };

        console.log('Form data:', formData);

        // Check required fields
        const $requiredFields = form.find('input[required]');
        let isValid = true;
        $requiredFields.each(function () {
            if (!$(this).val()) {
                isValid = false;
                return false;
            }
        });

        if (!isValid) {
            console.error('Required fields are empty');
            Toast.fire({
                icon: 'error',
                title: '❌ Please fill all required fields!'
            });
            submitBtn.prop('disabled', false).text(originalBtnText);
            return;
        }

        // Gửi AJAX đăng ký
        $.ajax({
            url: '/Account/RegisterAjax',
            type: 'POST',
            data: formData,
            dataType: 'json',
            success: function (response) {
                console.log('Register response:', response);
                try {
                    if (response && typeof response.success !== 'undefined') {
                        if (response.success) {
                            Toast.fire({
                                icon: 'success',
                                title: '✅ ' + response.message
                            });
                            setTimeout(() => {
                                window.location.href = '/Web_Com/Register/User' + (response.userId || '');
                            }, 1500);
                        } else {
                            Toast.fire({
                                icon: 'error',
                                title: '❌ ' + response.message
                            });
                        }
                    } else {
                        console.error('Invalid response format:', response);
                        Toast.fire({
                            icon: 'error',
                            title: '❌ Invalid server response'
                        });
                    }
                } catch (error) {
                    console.error('Error in success callback:', error);
                    Toast.fire({
                        icon: 'error',
                        title: '❌ An unexpected error occurred'
                    });
                }
            },
            error: function (xhr, status, error) {
                console.error('Register AJAX error:', status, error, xhr.responseText);
                Toast.fire({
                    icon: 'error',
                    title: '❌ Registration failed. Please try again'
                });
            },
            complete: function () {
                submitBtn.prop('disabled', false).text(originalBtnText);
            }
        });
    });
});