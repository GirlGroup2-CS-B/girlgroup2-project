from app.models import Base, engine
from sqlalchemy.schema import CreateSchema


def init_db() -> None:
    with engine.begin() as connection:
        connection.execute(CreateSchema("user", if_not_exists=True))
        Base.metadata.create_all(bind=connection)


if __name__ == "__main__":
    init_db()
    print("PostgreSQL database initialized.")
