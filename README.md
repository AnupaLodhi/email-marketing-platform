 # Email Marketing Platform

A production-ready email marketing platform built for internal company use.

## Live Project

https://mobdigitalemail.site/dashboard

## Overview

This platform helps manage subscribers, subscriber lists, email campaigns, campaign sending workflows, CSV import/export, and analytics from one dashboard.

It was developed as a real working software tool for company operations and deployed with a React frontend, Node.js/Express backend, Supabase database, VPS hosting, Nginx, SSL, PM2, and a custom domain.

## Features

- Dashboard for subscriber and campaign activity
- Subscriber management with add, edit, filter, and status tracking
- Subscriber list management
- Subscriber-list mapping through database relations
- Campaign creation with subject, preview text, sender details, and HTML template
- CSV import and export for subscriber data
- Backend email sending workflow through APIs
- Analytics pages for campaign and subscriber insights
- Authentication and setup flow
- Responsive dashboard UI
- Production deployment with custom domain and SSL

## Tech Stack

### Frontend
- React
- Vite
- TypeScript
- CSS

### Backend
- Node.js
- Express.js
- REST APIs
- Email delivery service integration

### Database
- Supabase
- PostgreSQL

### Deployment
- VPS hosting
- Nginx
- PM2
- SSL certificate
- Custom domain

## Project Structure

```text
.
├── public/
├── server/
│   ├── routes/
│   ├── services/
│   ├── index.js
│   └── supabase.js
├── src/
│   ├── app/
│   │   ├── components/
│   │   └── pages/
│   ├── lib/
│   └── styles/
├── package.json
├── vite.config.ts
└── README.md
