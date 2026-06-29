export type SourceOptions = {
  authId: string;
  authToken: string;
};

export type QueryOptions = {
  operation: string;
  // send_sms
  to: string;
  from: string;
  body: string;
  // make_call
  call_to: string;
  call_from: string;
  answer_url: string;
  answer_method: string;
  // send_whatsapp
  wa_to: string;
  wa_from: string;
  wa_body: string;
  wa_template: string;
  // lookup_number
  lookup_number: string;
  lookup_type: string;
};
