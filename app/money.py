"""
Money formatting & currency conversion.

All prices are STORED in the base currency (Admin → Settings → Prices).
For display we multiply by the chosen currency's ``rate``. The browser has an
identical formatter (``public/js/shared/money.js``) so prices look the same
whether the server or the browser rendered them.
"""

from __future__ import annotations

import math
from typing import Any

#: Display symbols. Unknown codes are shown as "XYZ 1,234".
SYMBOLS = {
    "USD": "$",
    "GBP": "£",
    "EUR": "€",
    "GHS": "GH₵",
    "NGN": "₦",
    "CAD": "CA$",
    "AUD": "A$",
    "ZAR": "R",
    "KES": "KSh",
}


def find_currency(currencies: list[dict[str, Any]], code: str | None) -> dict[str, Any]:
    """The currency with this code, or the first configured one."""
    for currency in currencies:
        if currency.get("code") == code:
            return currency
    return currencies[0] if currencies else {"code": "USD", "rate": 1}


def format_money(amount: float, currency: dict[str, Any] | None = None) -> str:
    """Format a base-currency amount, e.g. 189 → "$189" or "£149".

    Converted prices are rounded to whole units so they look intentional.
    """
    currency = currency or {"code": "USD", "rate": 1}
    rate = float(currency.get("rate") or 1) or 1
    value = math.floor(float(amount or 0) * rate + 0.5)  # round half up, like JS Math.round
    code = str(currency.get("code") or "USD").upper()
    symbol = SYMBOLS.get(code)
    return f"{symbol}{value:,}" if symbol else f"{code} {value:,}"
