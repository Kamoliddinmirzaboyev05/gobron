"""Gobron onboarding bot (aiogram 3).

Flow: /start -> share phone (contact) -> pick region -> type city -> first name
-> last name. On completion the user row is upserted with is_onboarded=True and
a button opens the Telegram Mini App (TMA).

The bot shares the backend's database and models — it imports app.* directly, so
there is a single source of truth for the User table.

Run from the gobron-backend directory:  python -m bot.main
"""
import asyncio
import logging

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    WebAppInfo,
)
from aiogram.types import CallbackQuery

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.repositories.user_repository import UserRepository
from bot.regions import REGIONS

logging.basicConfig(level=logging.INFO)


class Onboarding(StatesGroup):
    phone = State()
    region = State()
    city = State()
    first_name = State()
    last_name = State()


dp = Dispatcher()


def _region_keyboard() -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text=r, callback_data=f"region:{i}")]
        for i, r in enumerate(REGIONS)
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


def _open_app_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="⚽ Gobron ilovasini ochish",
                    web_app=WebAppInfo(url=settings.TMA_URL),
                )
            ]
        ]
    )


@dp.message(CommandStart())
async def start(message: Message, state: FSMContext):
    # Already onboarded? Skip straight to the app.
    async with AsyncSessionLocal() as db:
        user = await UserRepository(db).get_by_telegram_id(message.from_user.id)
    if user and user.is_onboarded and not user.is_blocked:
        await message.answer(
            "Xush kelibsiz! Ilovani oching 👇", reply_markup=_open_app_keyboard()
        )
        return

    await state.set_state(Onboarding.phone)
    kb = ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📱 Raqamni yuborish", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )
    await message.answer(
        "Assalomu alaykum! Gobronga xush kelibsiz.\n"
        "Ro'yxatdan o'tish uchun telefon raqamingizni yuboring:",
        reply_markup=kb,
    )


@dp.message(Onboarding.phone, F.contact)
async def got_phone(message: Message, state: FSMContext):
    await state.update_data(phone=message.contact.phone_number)
    await state.set_state(Onboarding.region)
    await message.answer("Viloyatingizni tanlang:", reply_markup=ReplyKeyboardRemove())
    await message.answer("👇", reply_markup=_region_keyboard())


@dp.message(Onboarding.phone)
async def phone_retry(message: Message):
    await message.answer("Iltimos, pastdagi tugma orqali raqamingizni yuboring.")


@dp.callback_query(Onboarding.region, F.data.startswith("region:"))
async def got_region(cb: CallbackQuery, state: FSMContext):
    idx = int(cb.data.split(":", 1)[1])
    await state.update_data(region=REGIONS[idx])
    await state.set_state(Onboarding.city)
    await cb.message.answer(f"Viloyat: {REGIONS[idx]}\nShahar/tumaningizni yozing:")
    await cb.answer()


@dp.message(Onboarding.city, F.text)
async def got_city(message: Message, state: FSMContext):
    await state.update_data(city=message.text.strip())
    await state.set_state(Onboarding.first_name)
    await message.answer("Ismingizni yozing:")


@dp.message(Onboarding.first_name, F.text)
async def got_first_name(message: Message, state: FSMContext):
    await state.update_data(first_name=message.text.strip())
    await state.set_state(Onboarding.last_name)
    await message.answer("Familiyangizni yozing:")


@dp.message(Onboarding.last_name, F.text)
async def got_last_name(message: Message, state: FSMContext):
    data = await state.get_data()
    await state.clear()

    async with AsyncSessionLocal() as db:
        repo = UserRepository(db)
        user = await repo.get_by_telegram_id(message.from_user.id)
        if user is None:
            user = User(telegram_id=message.from_user.id)
            db.add(user)
        user.phone = data["phone"]
        user.region = data["region"]
        user.city = data["city"]
        user.first_name = data["first_name"]
        user.last_name = message.text.strip()
        user.is_onboarded = True
        await db.commit()

    await message.answer(
        "✅ Ro'yxatdan o'tdingiz! Endi ilovadan foydalanishingiz mumkin.",
        reply_markup=_open_app_keyboard(),
    )


async def main() -> None:
    bot = Bot(settings.TELEGRAM_BOT_TOKEN)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
