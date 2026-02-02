using System;
using System.Security.Cryptography;

namespace Web_com.Helpers
{
    public class PasswordHasher
    {
        // Cấu hình (có thể đưa ra appsettings sau này)
        private const int SaltSize = 16;           // 128 bits
        private const int KeySize = 32;            // 256 bits
        private const int Iterations = 100_000;    // OWASP khuyến nghị 2023–2025 ~100k–600k

        private const string Delimiter = ":";      // Phân cách iterations:salt:hash

        /// <summary>
        /// Hash mật khẩu mới (dùng khi đăng ký hoặc migrate tài khoản cũ)
        /// </summary>
        public static string Hash(string password)
        {
            if (string.IsNullOrEmpty(password))
                throw new ArgumentException("Password cannot be empty.");

            byte[] salt = new byte[SaltSize];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(salt);
            }

            using (var pbkdf2 = new Rfc2898DeriveBytes(
                password,
                salt,
                Iterations,
                HashAlgorithmName.SHA256))
            {
                byte[] hash = pbkdf2.GetBytes(KeySize);

                // Kết hợp: salt + hash
                byte[] combined = new byte[SaltSize + KeySize];
                Buffer.BlockCopy(salt, 0, combined, 0, SaltSize);
                Buffer.BlockCopy(hash, 0, combined, SaltSize, KeySize);

                // Format: iterations:salt+hash (base64)
                return $"{Iterations}{Delimiter}{Convert.ToBase64String(combined)}";
            }
        }

        /// <summary>
        /// Kiểm tra mật khẩu nhập vào có khớp với hash đã lưu không
        /// </summary>
        public static bool Verify(string enteredPassword, string storedHash)
        {
            if (string.IsNullOrEmpty(storedHash) || string.IsNullOrEmpty(enteredPassword))
                return false;

            try
            {
                string[] parts = storedHash.Split(new[] { Delimiter }, StringSplitOptions.None);
                if (parts.Length != 2)
                    return false;

                if (!int.TryParse(parts[0], out int iterations) || iterations < 10000)
                    return false;

                byte[] combined = Convert.FromBase64String(parts[1]);
                if (combined.Length != SaltSize + KeySize)
                    return false;

                byte[] salt = new byte[SaltSize];
                byte[] storedHashBytes = new byte[KeySize];
                Buffer.BlockCopy(combined, 0, salt, 0, SaltSize);
                Buffer.BlockCopy(combined, SaltSize, storedHashBytes, 0, KeySize);

                using (var pbkdf2 = new Rfc2898DeriveBytes(
                    enteredPassword,
                    salt,
                    iterations,
                    HashAlgorithmName.SHA256))
                {
                    byte[] computedHash = pbkdf2.GetBytes(KeySize);

                    // So sánh constant-time để chống timing attack
                    uint diff = 0;
                    for (int i = 0; i < KeySize; i++)
                        diff |= (uint)(computedHash[i] ^ storedHashBytes[i]);

                    return diff == 0;
                }
            }
            catch
            {
                // Nếu format sai hoặc base64 invalid → coi như không khớp
                return false;
            }
        }

        /// <summary>
        /// Kiểm tra xem chuỗi lưu trong DB có phải mật khẩu plain text cũ không
        /// (dùng để migrate tự động khi đăng nhập lần đầu)
        /// </summary>
        public static bool IsLegacyPlainText(string storedValue)
        {
            // Giả sử mật khẩu cũ không chứa dấu ":" và độ dài <= 50
            return storedValue != null &&
                   storedValue.Length <= 50 &&
                   !storedValue.Contains(Delimiter);
        }
    }
}