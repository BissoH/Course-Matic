# Password hashing utilities. Passlib's CryptContext is used so the hashing scheme can be upgraded in future without rewriting call sites.

from passlib.context import CryptContext

# bcrypt is used because it includes an automatic salt and has a deliberately slow comparison step, making brute-force attacks computationally expensive.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    # Passlib performs the comparison in constant time, which prevents timing attacks that could reveal partial password information.
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    # Each call generates a new salt so identical passwords for different users produce different hashes in the database.
    return pwd_context.hash(password)
