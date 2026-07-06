export type SourceOptions = {
  authId: string;
  authToken: string;
};

export type QueryOptions = {
  operation: string;
  // shared by send_sms and make_call
  to: string;
  from: string;
  // send_sms
  body: string;
  // make_call
  answer_url: string;
  answer_method: string;
};
