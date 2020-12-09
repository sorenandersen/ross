# Data model

Listing of domain entities and their properties.

## User

Properties:

- id
- email
- role [Admin, StaffUser, Customer]
- restaurantId (for Admins and StaffUsers only)
- region (for Customers only)

## Restaurant

Properties:

- id
- adminUserId
- name
- description
- region
- profilePhotoUrl
- visibility [PRIVATE, PUBLIC]

## Seating

Properties:

- id
- restaurantId
- customerUserId
- seatingTime
- numSeats
- notes
- status
- tableNumber
- orderItems
- "hailing" true/false

Seating statuses
- PENDING
- ACCEPTED
- CANCELLED
- DECLINED
- SEATED
- CLOSED
