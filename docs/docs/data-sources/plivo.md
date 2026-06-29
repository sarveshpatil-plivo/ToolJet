---
id: plivo
title: Plivo
---

ToolJet can connect to your Plivo account to send SMS and WhatsApp messages, make outbound voice calls, and look up phone numbers.

<div style={{paddingTop:'24px'}}>

## Connection

To establish a connection with the Plivo data source, you can either click on the **+ Add new Data source** button located on the query panel or navigate to the **[Data Sources](/docs/data-sources/overview)** page from the ToolJet dashboard and choose Plivo as the data source.

ToolJet requires the following to connect to Plivo:
- **Auth ID**
- **Auth Token**

You can find your **Auth ID** and **Auth Token** in the **[Plivo Console](https://console.plivo.com/)**. If you don't already have them, you can generate a new pair from the console.

</div>

<div style={{paddingTop:'24px'}}>

## Querying Plivo

1. Click on **+ Add** button of the query manager at the bottom panel of the editor.
2. Select the **Plivo** datasource added in previous step.
3. Select the operation (**Send SMS**, **Make Call**, **Send WhatsApp**, or **Lookup Number**) from the dropdown and enter the required parameters.
4. Click on the **Preview** button to preview the output or Click on the **Run** button to trigger the query.

</div>

<div style={{paddingTop:'24px'}}>

## Supported operations

### Send SMS

This operation sends the specified message to the specified mobile number.

#### Required Parameters
- **From Number** — A Plivo phone number (or sender ID) the SMS is sent from.
- **To Number** — The destination phone number in E.164 format.
- **Body** — The text of the message to send.

### Make Call

This operation places an outbound voice call from a Plivo number to the destination number. When the call is answered, Plivo fetches call instructions (Plivo XML) from the **Answer URL** you provide.

#### Required Parameters
- **From Number** — The Plivo number (in E.164 format) that the call is placed from.
- **To Number** — The destination phone number in E.164 format.
- **Answer URL** — The URL that returns the Plivo XML to execute when the call is answered.

#### Optional Parameters
- **Answer Method** — The HTTP method (`GET` or `POST`) used to request the Answer URL. Defaults to `POST`.

### Send WhatsApp

This operation sends a WhatsApp message via Plivo. Free-form text is only delivered to a recipient within the 24-hour customer service window; for business-initiated messages you must supply an approved **Template**.

#### Required Parameters
- **From Number** — Your WhatsApp-enabled Plivo number, in the format `whatsapp:+14150000000` (or the number registered with your WhatsApp Business account).
- **To Number** — The recipient's WhatsApp number.
- At least one of **Body** or **Template** must be provided.

#### Optional Parameters
- **Body** — Free-form message text (delivered only inside the 24-hour session window).
- **Template** — A JSON template object for business-initiated messages. The object has the following shape:

  ```json
  {
    "name": "order_update",
    "language": "en_US",
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "12345" }
        ]
      }
    ]
  }
  ```

  - `name` (string, required) — the approved template name.
  - `language` (string, required) — the template language/locale code (e.g. `en_US`).
  - `components` (array, optional) — template components. Each component has a `type` (required), optional `sub_type` and `index`, and an optional `parameters` array; each parameter has a `type` (required) and one of `text` / `media` / `payload` / `currency` / `date_time` / `location` / `parameter_name`.

### Lookup Number

This operation looks up information about a phone number and returns its `phoneNumber`, `country`, `format`, and (when requested) `carrier` details.

#### Required Parameters
- **Number** — The phone number to look up, in E.164 format.

#### Optional Parameters
- **Type** — Set to `carrier` to include carrier information in the response. Leave blank for basic number details (country and format).

</div>
