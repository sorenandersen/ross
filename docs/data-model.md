# Data model

Listing of domain entities and their properties.

## User

Properties:

- id
- email
- role [Manager, StaffUser, Customer]
- region (for Customers only)
- restaurantId (for Managers and StaffUsers only)
- restaurantRole (for Managers and StaffUsers only)

## Restaurant

Properties:

- id
- managerId
- name
- description
- region
- profilePhotoUrl
- visibility [PRIVATE, PUBLIC]

## Seating

Properties:

- id
- restaurantId
- userId
- status
- seatingTime
- numSeats
- notes
- tableNumber
- orderItems
- "hailing" true/false

Seating statuses:

- PENDING
- ACCEPTED
- CANCELLED
- DECLINED
- SEATED
- CLOSED
