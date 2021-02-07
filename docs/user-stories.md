# User stories for the ROSS app

## Overview

The system allows customers to reserve seating and order food at restaurants.

There are 2 types of users in the system:

- Customer: uses "CustomerMobileApp" interface to reserve seating and make requests to restaurant
- StaffUser: Manager and waiters/waitresses. They will use "StaffApp" interface (on iPad) to manage customer interactions and general restaurant administration.

## User stories

### As a Customer...

- [x] I can signup using my email address and password from the CustomerMobileApp.
- [x] I can view a list of all restaurants within my region that are set to publicly available.
- [x] I can click through to view the full details of these restaurants (name, description, profilePhotoUrl,etc)
- [x] I can create a Seating (a reservation) at a restaurant, specifying the following:
  - seatingTime (time I want the table for)
  - numSeats (number of diners in my party)
  - notes (free text for any special requests)
- [x] I will receive an email acknowledgement whenever I create a new Seating
- [ ] I will receive an email notification whenever a StaffUser accepts or declines my Seating
- [x] I can cancel a pending or accepted Seating that I previously created
- [ ] When I have been seated, I can "hail" a server (e.g. to request that an order is taken, request the bill, etc)

### As a StaffUser...

- [x] I can signup using my email address and password from the StaffApp
- [x] I can create a new Restaurant, setting a name, description and a region from a preconfigured list of supported regions.
- [x] I can mark restaurants that I own as publicly available.
- [ ] I can upload a profile photo for restaurants that I own
- [x] I will receive an email notification whenever a customer creates a seating at my restaurant
- [x] I will receive an email notification whenever a customer cancels a seating at my restaurant
- [ ] I will receive a notification whenever a seated customer hails attention (this would typically be usually be implemented as a mobile push message, but we'll use email for v1)
- [ ] I can view a list of current and upcoming Seatings at my restaurant ordered by seatingTime (filtered by >= today)
- [ ] I can accept or decline a pending Seating request
- [ ] When a customer with a reserved Seating arrives at the restaurant, I can assign a tableNumber to their seating and set their status to "SEATED"
- [ ] When a customer arrives at the restaurant, I want to view a summary of their previous visits to my restaurant so I have some information to greet them with (e.g. number of visits within last 6 months, date of last visit)
- [ ] I can close a Seating whenever a Customer has finished their meal and vacated the table
- [ ] I can record a list of OrderItems against a seating. For v1, order items should just be an array of strings.
- [ ] I will receive a weekly report via email every Monday morning detailing:
  - Total number of seatings during the past 7 days in my restaurant
  - Seating counts per each day of the week
