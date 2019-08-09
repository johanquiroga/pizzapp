# Pizzapp

This is an API for a pizza-delivery company.

- New users can be created, their information can be edited, and they can be deleted. We store their name, email address, and street address.
- Users can log in and log out by creating or destroying a token.
- When a user is logged in, they should be able to GET all the possible menu items.
  - To create a new menu item you can use the `POST /products` endpoint. There are two products already created.
  - The menu items service does not allow to delete previously created items via the API due to complexity with orders created.
- A logged-in user should be able to fill a shopping cart with menu items
- A logged-in user should be able to create an order. This is integrated with the Sandbox of stripe.com to accept their payment.
- When an order is placed, an email (email template used can be found [here](https://postmarkapp.com/transactional-email-templates)) is sent to the user with a receipt.

The documentation for the API can be found [here](https://documenter.getpostman.com/view/2111440/SVYtLcnC)

## Running

To run the API with debugging active in all the application you can run:

```bash
$ NODE_DEBUG=server,handlers:*,lib:* nodemon index.js
```

Make sure you changed the secrets used for Stripe and Mailgun in the [configs file](./lib/config.js)

## Contribute

If you like to contribute, submit a new _PR_. I will get back to you as soon as possible.

## Report a Bug

Let me know if you found a bug by submitting a new _ISSUE_ or contact me at johan.c.quiroga@gmail.com.
