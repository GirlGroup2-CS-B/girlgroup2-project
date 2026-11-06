from sqlalchemy import inspect, text
from sqlalchemy.schema import CreateSchema

from app.models import Base, ItemReport, engine


def init_db() -> None:
    with engine.begin() as connection:
        connection.execute(CreateSchema("user", if_not_exists=True))
        Base.metadata.create_all(bind=connection)
        columns = {
            column["name"]
            for column in inspect(connection).get_columns(
                ItemReport.__table__.name,
                schema=ItemReport.__table__.schema,
            )
        }
        deleted_at = ItemReport.__table__.c.deleted_at
        if deleted_at.name not in columns:
            column_type = deleted_at.type.compile(dialect=connection.dialect)
            connection.execute(
                text(
                    f'ALTER TABLE "{ItemReport.__table__.schema}".'
                    f'"{ItemReport.__table__.name}" '
                    f'ADD COLUMN "{deleted_at.name}" {column_type}'
                )
            )


if __name__ == "__main__":
    init_db()
    print("PostgreSQL database initialized.")
