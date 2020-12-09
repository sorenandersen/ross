# Data model

NOTE: This is work in progress ...


User entity
- id
- email
- type [Customer, StaffUser]
- restaurant_id - for StaffUsers only
- region - for Customers only

Restaurant entity
- id
- owner_user_id
- name
- description
- region
- profilePhotoUrl
- visibility [PRIVATE, PUBLIC]

Seating entity
- id
- customer_id
- restaurant_id
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

