sap.ui.define([], function () {
    "use strict";
    return {
        _LCMobileNumber: function (oEvent,type) {
            var oField = "";
            (type === "ID") ? oField = oEvent : oField = oEvent.getSource();
            var value = oField.getValue().trim(); 
        
            var cleanedValue = value.replace(/[^0-9]/g, "").slice(0, 10);
            oField.setValue(cleanedValue);
        
            if (!cleanedValue) {
                oField.setValueState("Error");
                oField.setValueStateText("Mobile number is required");
                return false;
            } else if (cleanedValue.length !== 10) {
                oField.setValueState("Error");
                oField.setValueStateText("Mobile number must be exactly 10 digits");
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },
        
        _LCNameFormatAtoZ: function (oEvent,type) {
            var oInput ="";
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();

            var value = oInput.getValue(); 
            var namePattern = /^[a-zA-Z\s]+$/; 

            var cleanedValue = value.replace(/[^a-zA-Z\s]/g, "");
            oInput.setValue(cleanedValue);
            if(!value){
                oInput.setValueState("Error");
                oInput.setValueStateText("Name is required");
            }else if (value && !namePattern.test(value)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid name format");
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },
        
        _LCEmailFormat: function (oEvent,type) {
            var oInput = "";
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();

            var value = oInput.getValue().trim(); 
            var emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; 
        
            if (!value) {              
                oInput.setValueState("Error");
                oInput.setValueStateText("Email is required");
                return false;
            } else if (!emailRegex.test(value)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Please enter a valid email address");
                return false;
            } else {              
                oInput.setValueState("None");
                return true;
            }
        },  
        
        _LCAmountFormat: function (oEvent,type) {
            var oInput = "";
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();       

            var value = oInput.getValue().trim();        
            var cleanedValue = value.replace(/[^0-9.]/g, "");        
            var parts = cleanedValue.split(".")    
            if (parts.length === 2) {
                cleanedValue = parts[0] + "." + parts[1].slice(0, 2);
            }        
            oInput.setValue(cleanedValue);        
            if (!cleanedValue) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Amount is required");
                return false;
            } else if (!/^\d+(\.\d{1,2})?$/.test(cleanedValue)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid amount format (up to 2 decimal places)");
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },

        _LCAccountNumberFormat: function (oEvent, type) {
            var oInput = "";        
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();     

            var value = oInput.getValue().trim();        
            var cleanedValue = value.replace(/[^0-9]/g, "");                                  
            oInput.setValue(cleanedValue);                   

            if (!cleanedValue) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Account number is required");
                return false;
            } else if (cleanedValue.length < 10 || cleanedValue.length > 18) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Account number must be between 10 and 18 digits");
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        } ,
        
        _LCDateFormat: function (oEvent, type) {
            var oInput = "";                  
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();
            var value = oInput.getValue().trim();
                  
            var datePattern = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/;
        
            if (!datePattern.test(value)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid date format. Use dd/MM/yyyy");
                return false;
            }        
            var parts = value.split("/")  ;          
                  
            var maxDaysInMonth = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10), 0).getDate();
            if (parseInt(parts[0], 10) > maxDaysInMonth) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid day for the selected month");
                return false;
            }        
            oInput.setValueState("None");
            return true;
        },

        _LCPANCardFormat: function (oEvent, type) {
            var oInput = "";
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();    

            var value = oInput.getValue().trim().toUpperCase(); 
            var panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;        
            oInput.setValue(value);        
            if (!value) {
                oInput.setValueState("Error");
                oInput.setValueStateText("PAN Card number is required");
                return false;
            } else if (!panPattern.test(value)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid PAN format (Format: AAAAA1234A)");
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },

        _LCAadhaarFormat: function (oEvent, type) {
            var oInput = "";        
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();   
            var value = oInput.getValue().trim();                   
            var aadhaarPattern = /^\d{12}$/;        
            var cleanedValue = value.replace(/[^0-9]/g, "");
            oInput.setValue(cleanedValue);        
            if (!cleanedValue) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Aadhaar number is required");
                return false;
            } else if (!aadhaarPattern.test(cleanedValue)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid Aadhaar format (12-digit number)");
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },

        _LCGSTFormat: function (oEvent, type) {
            var oInput = "";        
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();
        
            var value = oInput.getValue().trim().toUpperCase();      
            var gstPattern = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;        
            oInput.setValue(value);        
            if (!value) {
                oInput.setValueState("Error");
                oInput.setValueStateText("GST number is required");
                return false;
            } else if (!gstPattern.test(value)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid GST format (Format: 11AAAAA1234A1Z1)");
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },

        _LCIFSCFormat: function (oEvent, type) {
            var oInput = "";        
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();        
            var value = oInput.getValue().trim().toUpperCase();
            var ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;        
            oInput.setValue(value);        
            if (!value) {
                oInput.setValueState("Error");
                oInput.setValueStateText("IFSC code is required");
                return false;
            } else if (!ifscPattern.test(value)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid IFSC format (Format: ABCD0123456)");
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },

        _LCPassportFormat: function (oEvent, type) {
            var oInput = "";        
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();
        
            var value = oInput.getValue().trim().toUpperCase(); 
            var passportPattern = /^[A-Z][0-9]{7}$/;
            oInput.setValue(value);
            if (!value) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Passport number is required");
                return false;
            } else if (!passportPattern.test(value)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid Passport format (Format: A1234567)");
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },
        
        _LCVoterIDFormat: function (oEvent, type) {
            var oInput = "";
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();
        
            var value = oInput.getValue().trim().toUpperCase();
            var voterIdPattern = /^[A-Z]{3}[0-9]{7}$/;
            oInput.setValue(value);        
            if (!value) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Voter ID is required");
                return false;
            } else if (!voterIdPattern.test(value)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Invalid Voter ID format (Format: ABC1234567)");
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },    
        
        CommanValidationDropDown:function(oEvent,type,Mess1,Mess2){
            var oInput = "";
            (type === "ID") ? oInput = oEvent : oInput = oEvent.getSource();
        
            var value = oInput.getValue().trim();                 
            if (!value) {
                oInput.setValueState("Error");
                oInput.setValueStateText(Mess1);
                return false;
            } else if (!voterIdPattern.test(value)) {
                oInput.setValueState("Error");
                oInput.setValueStateText(Mess2);
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        }
        
                
    };
});
