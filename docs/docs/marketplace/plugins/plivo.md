---
id: marketplace-plugin-plivo
title: Plivo
---

You can integrate your ToolJet application with Plivo for SMS, WhatsApp, voice call, and number lookup functionality.

:::note
Before following this guide, it is assumed that you have already completed the process of **[Using Marketplace plugins](/docs/marketplace/marketplace-overview#using-marketplace-plugins)**.
:::

## Connection

To use the Plivo plugin, you need the following credentials:
- **Auth Token**
- **Auth ID**

:::info Generating Auth Token/ID
- Navigate to the Plivo Console (https://www.plivo.com/)
- In the console, you will see your auth ID and auth token listed under the "API" section.
- If you don't see your auth ID and auth token, you can generate new ones by clicking on the "Generate New Auth ID/Token" button.
:::

<div style={{textAlign: 'center'}}>

<img className="screenshot-full" src="/img/marketplace/plugins/plivo/connection-v2.png" alt="Configuring Plivo In ToolJet" />

</div>

## Supported Queries

### Send SMS

You can use the Send SMS operation to send an SMS to a specified mobile number.

#### Required Parameters: 

- **To Number**
- **From Number**
- **Body**

<div style={{textAlign: 'center'}}>

<img className="screenshot-full" src="/img/marketplace/plugins/plivo/sendsms-v2.png" alt="Send SMS Using plivo" />

</div>

### Make Call

You can use the Make Call operation to place an outbound voice call. When the call is answered, Plivo fetches the call instructions (Plivo XML) from the Answer URL you provide.

#### Required Parameters: 

- **From Number**
- **To Number**
- **Answer URL**

#### Optional Parameters: 

- **Answer Method** (HTTP method used to request the Answer URL, defaults to `POST`)

### Send WhatsApp

You can use the Send WhatsApp operation to send a WhatsApp message. Free-form text is only delivered within the 24-hour customer service window; for business-initiated messages, supply an approved **Template**.

#### Required Parameters: 

- **From Number** (your WhatsApp-enabled Plivo number)
- **To Number**
- At least one of **Body** or **Template**

#### Optional Parameters: 

- **Body** (free-form text, delivered only inside the 24-hour session window)
- **Template** (a JSON object for templated messages)

The **Template** field accepts a JSON object with this shape:

```json
{
  "name": "order_update",
  "language": "en_US",
  "components": [
    { "type": "body", "parameters": [ { "type": "text", "text": "12345" } ] }
  ]
}
```

- `name` (string, required) and `language` (string, required) are mandatory.
- `components` (array, optional) — each component has a required `type`, optional `sub_type`/`index`, and an optional `parameters` array (each parameter has a required `type` plus one of `text` / `media` / `payload` / `currency` / `date_time` / `location` / `parameter_name`).

### Lookup Number

You can use the Lookup Number operation to retrieve information about a phone number. The response includes `phoneNumber`, `country`, `format`, and (when requested) `carrier`.

#### Required Parameters: 

- **Number** (the phone number to look up, in E.164 format)

#### Optional Parameters: 

- **Type** (set to `carrier` to include carrier details; leave blank for basic info)