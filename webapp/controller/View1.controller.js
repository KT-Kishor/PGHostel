sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../utils/validation"
], (Controller,utils) => {
    "use strict";

    return Controller.extend("sap.kt.com.minihrsolution.controller.View1", {
        onInit() {

        },

        MobileNumberLC:function(oEvent){
           this.Mobile = utils._LCMobileNumber(oEvent,"");
        },

        NameLC:function(oEvent){
            this.Name = utils._LCNameFormatAtoZ(oEvent);
            // console.log("Name" , Name);
            
        },

        EmailIDLC:function(oEvent){
            this.Email = utils._LCEmailFormat(oEvent);
        //    console.log("Email",Email);
           
        },

        AmountLC:function(oEvent){
            this.Amount = utils._LCAmountFormat(oEvent,"Save","view");
            // console.log("Amount" ,Amount);              
        },

        AccountNumberLC:function(oEvent){
            this.AccountNo = utils._LCAccountNumberFormat(oEvent,"Save","view");
            // console.log("Account Number",AccountNo);            
        },

        DateFormatLC:function(oEvent){
            this.date = utils._LCDateFormat(oEvent,"Save","view")
            // console.log("Date",date);
        },

        PANCardFormatLC:function(oEvent){
            this.PanCard = utils._LCPANCardFormat(oEvent,"Save","view");
            // console.log("PanCard",PanCard);            
        },
        
        AadhaarFormatLC:function(oEvent){
            this.Aadhar = utils._LCAadhaarFormat(oEvent,"Save","view");
            // console.log("Aadhar Card",Aadhar);            
        },

        GSTFormatLC:function(oEvent){
            this.GST = utils._LCGSTFormat(oEvent,"Save","view");
            // console.log("GST",GST);            
        },

        IFSCFormatLC:function(oEvent){
            this.IFSC = utils._LCIFSCFormat(oEvent,"Save","view");
            // console.log("IFSC",IFSC);            
        },

        PassportFormatLC:function(oEvent){
            this.passport = utils._LCPassportFormat(oEvent,"Save","view");
            // console.log("Passport",passport);            
        },

        VoterIDFormatLC:function(oEvent){
            this.Voter = utils._LCVoterIDFormat(oEvent,"Save","view");
            // console.log("Voter",Voter);            
        },

        AddressLC:function(oEvent){
            this.Address = utils.CommanValidationDropDown(oEvent,"Save","view","Address is required","Invalid Address");
            // console.log("Address",Address);
            
        },       

        onPressSubmit: function(oEvent) {            

            if(utils._LCMobileNumber(this.byId("idMobileNumber"),"ID") && utils._LCNameFormatAtoZ(this.byId("idName"),"ID") && utils._LCEmailFormat(this.byId("idEmail"),"ID") && utils._LCAmountFormat(this.byId("idAmount"),"ID") && utils._LCAccountNumberFormat(this.byId("isAccount"),"ID") && utils._LCDateFormat(this.byId("idDate"),"ID") && utils._LCPANCardFormat(this.byId("idPanCard"),"ID") && utils._LCAadhaarFormat(this.byId("idAadhar"),"ID") && utils._LCGSTFormat(this.byId("idGST"),"ID") && utils._LCIFSCFormat(this.byId("idIFSC"),"ID") && utils._LCPassportFormat(this.byId("idPassport"),"ID") && utils._LCVoterIDFormat(this.byId("idVoter"),"ID") && utils.CommanValidationDropDown(this.byId("idAddress"),"ID","Address is required","Invalid Address") ){

            }else{
                sap.m.MessageToast.show("Make sure all the mandatory fields entered or validate the entered value")
            }
        }
    });
});