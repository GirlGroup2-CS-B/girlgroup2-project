from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .models.item_report import Category, ItemReport, Location


def search_items(session: Session, keyword: str) -> list[ItemReport]:
    term = keyword.strip()
    if not term:
        return []

    statement = (
        select(ItemReport)
        .join(Category, ItemReport.category_id == Category.id)
        .join(Location, ItemReport.location_id == Location.id)
        .where(
            or_(
                ItemReport.title.contains(term, autoescape=True),
                ItemReport.description.contains(term, autoescape=True),
                ItemReport.contact_info.contains(term, autoescape=True),
                Category.name.contains(term, autoescape=True),
                Location.name.contains(term, autoescape=True),
            )
        )
        .order_by(ItemReport.date_lost_found.desc(), ItemReport.id.desc())
    )
    return list(session.scalars(statement))


def filter_items_by_category(
    session: Session,
    category_name: str,
) -> list[ItemReport]:
    name = category_name.strip()
    if not name:
        return []

    statement = (
        select(ItemReport)
        .join(Category, ItemReport.category_id == Category.id)
        .where(Category.name == name)
        .order_by(ItemReport.date_lost_found.desc(), ItemReport.id.desc())
    )
    return list(session.scalars(statement))
