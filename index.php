if($_POST['paymentStatus']){
        $date_str = $_POST['date'];
        $date_arr = explode(' ', $date_str);
          $month_num = date('m', strtotime($date_arr[1]));
          $formatted_date = $date_arr[3] . '-' . $month_num . '-' . $date_arr[2];

        if($_POST['paymentStatus'] == 'success'){
        $paid_type;
        if($_POST['amount'] == 1500){
            $paid_type = 'regular'; 
        }else if($_POST['amount'] == 10 ){
            $paid_type = 'daily';
        }else if($_POST['amount'] == 200 ){
            $paid_type = 'monthly';
        }else if($_POST['amount'] == 5000 || $_POST['amount'] == 4500){
            $paid_type = 'vip';
        }else if($_POST['amount'] == 10000 || $_POST['amount'] == '10,000'){
            $paid_type = 'vvip';
        }else{}
        $query=mysqli_query($conn,"update users set paid = 'yes', paid_type='{$paid_type}' where checkoutRequestId='{$_POST['checkoutRequestId']}'");
        $get_user = mysqli_query($conn,"select * from users where checkoutRequestId='{$_POST['checkoutRequestId']}' order by id desc limit 1");
        $user = mysqli_fetch_assoc($get_user);
        $query1=mysqli_query($conn,"insert into payment_subscriptions (user_id,transId,paymentStatus,checkoutRequestId,amount,subscribe_date) values('{$user['id']}','{$_POST['transId']}','{$_POST['paymentStatus']}',
        '{$_POST['checkoutRequestId']}','{$_POST['amount']}','{$formatted_date}')");
      
      mysqli_query($conn,"insert into notifications(title,user_id,to_id,meet_id,msg,status) values ('Account Subscription','{$user['id']}','','','You have successfully buy {$paid_type} plan on {$_POST['date']}','')");

        if($query){
            $data['result'] = true;
            $data['message'] = 'Updated successfully';
        }else{
          $data['result'] = false;
          $data['message'] = 'Error'; 
      }
    }
    else{
        $data['result'] = false;
        $data['message'] = 'Payment Fail, Please check your account exist on MPESA or try again later';
    }
}