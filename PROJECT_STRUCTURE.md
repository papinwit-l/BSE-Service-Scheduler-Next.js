# BSE Booking System — Project Structure

```
bse-booking/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (fonts, metadata)
│   │   ├── page.tsx                # Landing page
│   │   ├── globals.css             # Tailwind + BSE custom tokens
│   │   │
│   │   ├── booking/
│   │   │   ├── page.tsx            # Single-page booking form
│   │   │   ├── success/
│   │   │   │   └── page.tsx        # Booking confirmation + code
│   │   │   └── _components/        # Booking form parts
│   │   │       ├── ServicePicker.tsx
│   │   │       ├── DatePicker.tsx
│   │   │       ├── TimeBlockPicker.tsx
│   │   │       └── CustomerForm.tsx
│   │   │
│   │   ├── status/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Public booking status tracker
│   │   │
│   │   ├── admin/
│   │   │   ├── login/
│   │   │   │   └── page.tsx        # Admin login
│   │   │   ├── layout.tsx          # Admin shell (sidebar, auth guard)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx        # Overview + today's bookings
│   │   │   ├── bookings/
│   │   │   │   ├── page.tsx        # Booking list + filters
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx    # Booking detail + status update
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx        # Calendar slot view
│   │   │   └── settings/
│   │   │       └── page.tsx        # Services, time blocks, days, holidays
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts    # NextAuth handler
│   │       ├── bookings/
│   │       │   ├── route.ts        # GET (list) / POST (create)
│   │       │   └── [id]/
│   │       │       └── route.ts    # GET / PATCH / DELETE
│   │       ├── services/
│   │       │   └── route.ts        # GET (public) / POST / PATCH / DELETE
│   │       ├── time-blocks/
│   │       │   └── route.ts        # GET (public) / CRUD (admin)
│   │       ├── slots/
│   │       │   └── route.ts        # GET available slots for a date
│   │       ├── day-configs/
│   │       │   └── route.ts        # GET / PATCH
│   │       ├── closed-dates/
│   │       │   └── route.ts        # CRUD
│   │       └── line/
│   │           └── notify/
│   │               └── route.ts    # LINE push notification
│   │
│   ├── components/
│   │   ├── ui/                     # Shared UI (Button, Input, Badge, Card...)
│   │   └── layout/                 # Header, Footer, AdminSidebar
│   │
│   └── lib/
│       ├── prisma.ts               # Prisma client singleton
│       ├── booking-code.ts         # BK-XXXXXX generator
│       ├── auth.ts                 # NextAuth config
│       ├── line.ts                 # LINE Messaging API helper
│       └── validators.ts           # Zod schemas for form validation
│
├── prisma/
│   ├── schema.prisma               # ✅ Created
│   └── seed.ts                     # ✅ Created
│
├── .env.example                    # ✅ Created
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS + BSE CI tokens
- **Icons**: Lucide React
- **ORM**: Prisma (MySQL)
- **Auth**: NextAuth.js (credentials)
- **Validation**: Zod
- **Hosting**: Vercel
- **Database**: cPanel MySQL
- **Notifications**: LINE Messaging API

## BSE CI Tokens (for tailwind.config.ts)
- Void: #07070A (bg)
- Carbon: #111116 (cards)
- Graphite: #1C1C24 (elevated)
- Zinc: #2E2E3A (borders)
- Steel: #71717A (muted text)
- Silver: #D4D4D8 (body text)
- White: #FAFAFA (headings)
- Cyan: #00E0F0 (primary accent)
- Cyan Deep: #0891B2 (accent pressed)
- Amber: #FBBF24 (warning/pending)
- Emerald: #34D399 (success)
- Rose: #FB7185 (error/cancel)

## Fonts
- Display: Outfit 700/800
- Body: DM Sans 400/500
- Mono: JetBrains Mono 500
