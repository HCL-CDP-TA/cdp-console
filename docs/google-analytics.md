# Google Analytics Integration

This project includes comprehensive Google Analytics tracking for monitoring user interactions, API calls, errors, and data management operations.

## Setup

1. **Get a Google Analytics Tracking ID**

   - Go to [Google Analytics](https://analytics.google.com/)
   - Create a new property for your CDP Console
   - Copy your tracking ID (format: `G-XXXXXXXXXX` for GA4)

2. **Configure Environment Variables**

   ```bash
   # In your .env.local file
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

3. **Deploy and Verify**
   - Deploy your application
   - Visit your site and perform some actions
   - Check Google Analytics Real-Time reports to verify tracking

## What's Being Tracked

### Page Views

- Automatic tracking of all page navigations
- Uses Next.js router integration for SPA-style navigation

### Authentication Events

- User login success/failure
- Login errors (network, validation, etc.)

### Data Management Operations

- User property creation, updates, and deletion
- Data mapping operations (when implemented)
- User management actions (when implemented)

### API Monitoring

- API call success/failure rates
- Endpoint performance tracking
- Error monitoring and debugging

### Error Tracking

- Network errors
- API errors with detailed messages
- Client-side errors with context

## Custom Events

The following custom events are tracked:

### Authentication

- `login` - Successful user authentication
- `login_failed` - Failed login attempt
- `logout` - User logout (when implemented)

### Data Management

- `create` - New resource creation (user_property, data_mapping, etc.)
- `update` - Resource updates
- `delete` - Resource deletion

### API Calls

- `api_call` - All API interactions with success/failure status

### Errors

- `error` - All application errors with context

## Analytics Functions

### Core Functions

- `pageview(url)` - Track page views
- `event({ action, category, label, value })` - Track custom events

### Specialized Functions

- `trackUserAction(action, details)` - Track user interactions
- `trackAPICall(endpoint, method, success)` - Track API usage
- `trackError(errorType, message, location)` - Track errors
- `trackAuthentication(action)` - Track auth events
- `trackDataManagement(action, resourceType, details)` - Track data operations

## Privacy Considerations

- Only essential interaction data is tracked
- No personally identifiable information (PII) is sent to Analytics
- User property names and basic metadata only (no sensitive data)
- Error messages are sanitized to remove sensitive information

## Development

### Adding New Tracking

```typescript
import { trackUserAction, event } from "@/lib/analytics"

// Track a custom user action
trackUserAction("button_click", {
  buttonType: "export",
  section: "data-mappings",
})

// Track a custom event
event({
  action: "custom_action",
  category: "user_interaction",
  label: "description",
  value: 1,
})
```

### Testing Analytics

- Use browser dev tools Network tab to see gtag requests
- Check Google Analytics Real-Time reports
- Use Google Analytics Debugger browser extension

## File Structure

```
components/
├── google-analytics.tsx      # GA script component
└── analytics-provider.tsx    # Client-side page tracking

hooks/
└── use-google-analytics.ts   # Page view tracking hook

lib/
└── analytics.ts              # Analytics utility functions

app/
└── layout.tsx               # Root layout with GA integration
```

## Troubleshooting

### Analytics Not Working

1. Check that `NEXT_PUBLIC_GA_ID` is set correctly
2. Verify the tracking ID format (G-XXXXXXXXXX for GA4)
3. Check browser console for errors
4. Ensure ad blockers aren't interfering

### Missing Events

1. Check if the component importing analytics functions
2. Verify function calls are in the correct locations
3. Check Network tab for outgoing gtag requests

### Real-Time Data Not Showing

- Real-time data can take 1-2 minutes to appear
- Use Google Analytics DebugView for immediate feedback
- Check that your IP isn't filtered in GA settings
