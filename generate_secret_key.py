from cryptography.fernet import Fernet


def main():

    # Generate a key to use for encryption/decryption
    key = Fernet.generate_key()

    # Store the key somewhere safe
    print(f"SECRET_KEY: {key}")


if __name__ == "__main__":
    main()