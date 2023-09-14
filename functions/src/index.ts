
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import axios, {AxiosResponse} from "axios";
import moment from "moment";
import httpRequest from "request";

/* eslist-disable */
const cors = require("cors")({origin: true});
// You can also use CommonJS `require('@sentry/node')` instead of `import`
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: 'https://d8fe0bb12056a5c0e78210df589f26b3@o4504167984136192.ingest.sentry.io/4505877489057792',
  integrations: [
    new ProfilingIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
});
/* eslist-disable */
interface IMpesacallback {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string,
      CheckoutRequestID?: string,
      ResultCode?: number,
      ResultDesc?: string,
      CallbackMetadata?: {
        Item: Array<Item>
      } | null | undefined
    }
  }
}
type Item = {
  Name: string,
  Value: string | number
}
type RequestBody = {
  phone: string;
  amount: string;
  token: string;
  type: "mpesa" | "card"
}
type StkResponseBody = {
  status: string,
  message: string,
  checkoutRequestId: string | null | undefined,
}
type StkResponse = {
  MerchantRequestID: string | null | undefined;
  CheckoutRequestID: string | null | undefined;
  ResponseCode: string | null | undefined;
  ResponseDescription: string | null | undefined;
  CustomerMessage: string | null | undefined;
}
admin.initializeApp();
export const initiatestkpush = functions.https.onRequest(async (request, response) => {
  cors(request, response, async () => {
    try {
      const token = await getAuth();
      const phone = request.body.phone;
      const amount = request.body.amount;
      const type = request.body.type;
      if (type == "mpesa" || type === "card") {
        if (amount && phone && type) {
          const data: RequestBody = {
            token: token,
            phone: phone,
            amount: amount,
            type: type,
  
          };
          const resp: StkResponseBody = await initiatePush(data);
          response.send(resp);
        } else {
          const resp: StkResponseBody = {
            message: "Failed either amount or phone Number missing",
            status: "Error",
            checkoutRequestId: "",
          };
          response.send(resp);
        }
      } else {
        const resp: StkResponseBody = {
          message: "Invalid Payment Method! Payment Method Can Only Be card or mpesa",
          status: "Error",
          checkoutRequestId: "",
        };
        response.send(resp);
      }
    } catch (error) {
      const resp: StkResponseBody = {
        message: "Invalid Payment Method! Payment Method Can Only Be card or mpesa",
        status: "Error",
        checkoutRequestId: "",
      }
      Sentry.captureException(error)
      response.send(resp)
    }
  });
});
export const mpesaCallback = functions.https.onRequest(async (request, response) => {
  cors(request, response, async () => {
    try {
      const data: IMpesacallback = request.body;
      if (data?.Body?.stkCallback?.ResultCode === 0) {
        const options = {
          "method": "POST",
          "url": "https://locatestudent.com/meet/api/api.php",
          "formData": {
            "amount": parseInt(data?.Body?.stkCallback?.CallbackMetadata?.Item[0]?.Value?.toString() ?? "0"),
            "checkoutRequestId": data?.Body?.stkCallback?.CheckoutRequestID ?? "",
            "paymentStatus": "success",
            "transId": data?.Body?.stkCallback?.CallbackMetadata?.Item[1].Value.toString() ?? "",
            "date": new Date().toDateString(),
          },
        };
        httpRequest(options, function(error:any, response:any) {
          if (error) throw new Error(error);
          console.log(response.body);
        });
      } else {
        Sentry.captureMessage(JSON.stringify(data?.Body?.stkCallback),'log');
        const options = {
          "method": "POST",
          "url": "https://locatestudent.com/meet/api/api.php",
          "formData": {
            "amount": parseInt(data?.Body?.stkCallback?.CallbackMetadata?.Item[0]?.Value?.toString() ?? "0"),
            "checkoutRequestId": data?.Body?.stkCallback?.CheckoutRequestID ?? "",
            "paymentStatus": "fail",
            "transId": data?.Body?.stkCallback?.CallbackMetadata?.Item[1].Value.toString() ?? "",
            "date": new Date().toDateString(),
            "message": data?.Body?.stkCallback?.ResultDesc
          },
        };
        httpRequest(options, function(error:any, response:any) {
          if (error) throw new Error(error);
          console.log(response.body);
        });
      }
    } catch (error) {
      Sentry.captureException(error)
      const options = {
        "method": "POST",
        "url": "https://locatestudent.com/meet/api/api.php",
        "formData": {
          "amount": 0,
          "checkoutRequestId": "",
          "paymentStatus": "fail",
          "transId": "",
          "date": new Date().toDateString(),
        },
      };
      httpRequest(options, function(error:any, response:any) {
        if (error) throw new Error(error);
        console.log(response.body);
      });
    }
  });
  response.send({success: true});
});
const getAuth = async (): Promise<string> => {
  const token: string =
    btoa(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`);
  const config = {
    method: "get",
    url: "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    headers: {
      "Authorization": `Basic ${token}`,
    },
  };
  return axios(config)
    .then(function(result: AxiosResponse) {
      return result.data["access_token"];
    })
    .catch(function() {
      return "0";
    });
};
const initiatePush = async (data: RequestBody): Promise<StkResponseBody> => {
  let resp: StkResponse = {
    ResponseDescription: "",
    MerchantRequestID: undefined,
    CheckoutRequestID: undefined,
    ResponseCode: undefined,
    CustomerMessage: undefined,
  };
  console.log(data);
  const timestamp: string = moment().format("YYYYMMDDhhmmss").toString();
  const password: string = btoa(`${process.env.MPESA_SHORT_CODE}${process.env.PASSKEY}${timestamp}`);
  return await fetch("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      "BusinessShortCode": Number(process.env.MPESA_SHORT_CODE),
      "Password": password,
      "Timestamp": timestamp,
      "TransactionType": "CustomerBuyGoodsOnline",
      "Amount": Number(data.amount),
      "PartyA": parseInt(formatPhoneNumber(data.phone).trim()),
      "PartyB": 9652927,
      "PhoneNumber": parseInt(formatPhoneNumber(data.phone).trim()),
      "CallBackURL": process.env.CALLBACK_URL,
      "AccountReference": "CompanyXLTD",
      "TransactionDesc": "Payment of X",
    }),
  })
    .then((response) => response.json())
    .then((result) => {
      resp = result as StkResponse;
      console.log(result);
      const message: StkResponseBody = {
        checkoutRequestId: resp.CheckoutRequestID,
        message: resp?.CustomerMessage ?? "Error Please Try Again!",
        status: resp.ResponseCode ?? "1",
      };
      return message;
    })
    .catch((error) => {
      Sentry.captureException(error)
      const message: StkResponseBody = {
        checkoutRequestId: "",
        message: "Error Please Check Your Phone Number And Try Again",
        status: "1",
      };
      return message;
    });
};

const formatPhoneNumber = (phone = ""): string => {
  if (phone.startsWith("0")) {
    phone = phone.replace("0", "254");
  } else if (phone.startsWith("+")) {
    phone = phone.substring(1);
  } else if (phone.startsWith("0110") || phone.startsWith("0111")) {
    phone = phone.replace("0", "254");
  } else if (phone.startsWith("7")) {
    phone = "254" + phone;
  }
  return phone;
};
