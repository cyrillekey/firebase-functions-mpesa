interface IMpesacallback {
    Body:{
        stkCallBack:{
            MerchantRequestID:string,
            CheckoutRequestID:string,
            ResultCode:number,
            ResultDesc:string | undefined | null,
            CallbackMetadata:{
                item:Array<Item>
            } | null | undefined
        }
    }
}
type Item = {
    Name:string,
    Value:string | number,
};

export {IMpesacallback, Item};
