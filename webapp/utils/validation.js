sap.ui.define([], function () {
  "use strict";
  return {
    // Validate mobile number
    _LCvalidateMobileNumber: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var oValue = oField
        .getValue()
        .replace(/[^0-9]/g, "")
        .slice(0, 10);
      if (oField.getValue() !== oValue) oField.setValue(oValue);
      var regex = /^\d{10}$/;
      if (!regex.test(oValue)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Email validation function
    _LCvalidateEmail: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var sValue = oField.getValue().trim();
      if (!sValue) {
        oField.setValueState("Error");
        return false;
      }
      // Split emails by comma, semicolon, or space
      var aEmails = sValue.split(/[,;]+/).map(email => email.trim()).filter(email => email);
      var regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      var bAllValid = aEmails.every(email => regex.test(email));
      if (!bAllValid) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },
    

    // Name validation function
    _LCvalidateName: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var oValue = oField.getValue().replace(/[^a-zA-Z\s]/g, "");
      if (oField.getValue() !== oValue) oField.setValue(oValue);
      var regex = /^[a-zA-Z\s]+$/;
      if (!regex.test(oValue)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Amount validation function
    _LCvalidateAmount: function (oEvent, type) {
      var oInput = type === "ID" ? (oInput = oEvent) : (oInput = oEvent.getSource());
      var value = oInput.getValue().trim();
      var cleanedValue = value.replace(/[^0-9.]/g, "");
      var parts = cleanedValue.split(".");
      if (parts.length === 2) {
        cleanedValue = parts[0] + "." + parts[1].slice(0, 2);
      }
      oInput.setValue(cleanedValue);
      if (parseFloat(cleanedValue) <= 0) {
        oInput.setValueState("Error");
        return false;
      }
      if (!/^\d+(\.\d{1,2})?$/.test(cleanedValue)) {
        oInput.setValueState("Error");
        return false;
      } else {
        oInput.setValueState("None"); 
        return true;
      }
    },

    // PAN card validation function
    _LCvalidatePanCard: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      oField.setValue(oField.getValue().trim().toUpperCase());
      var regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!regex.test(oField.getValue().trim().toUpperCase())) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // IFSC code validation
    _LCvalidateIfcCode: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      oField.setValue(oField.getValue().trim().toUpperCase());
      var regex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!regex.test(oField.getValue().trim().toUpperCase())) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Aadhar card validation
    _LCvalidateAadharCard: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var oValue = oField
        .getValue()
        .replace(/[^0-9]/g, "")
        .slice(0, 12);
      if (oField.getValue() !== oValue) oField.setValue(oValue);
      var regex = /^[0-9]{12}$/;
      if (!regex.test(oValue)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Voter ID validation
    _LCvalidateVoterId: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var value = oField.getValue().trim().toUpperCase();
      oField.setValue(value);
      var regex = /^[A-Z]{3,4}[0-9]{7,8}$/;
      if (!regex.test(value)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Passport validation
    _LCvalidatePassport: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var value = oField.getValue().trim().toUpperCase();
      oField.setValue(value);
      var regex = /^[A-PR-WY][1-9]\d\s?\d{4}[1-9]$/;
      if (!regex.test(value)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Account No Validation
    _LCvalidateAccountNo: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var oValue = oField
        .getValue()
        .replace(/[^0-9]/g, "")
        .slice(0, 18);
      if (oField.getValue() !== oValue) oField.setValue(oValue);
      var regex = /^[0-9]{9,18}$/;
      if (!regex.test(oValue)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Date validation function
    _LCvalidateDate: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var value = oField.getValue().trim();
      var regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/;
      if (!regex.test(value)) {
        oField.setValueState("Error");
        return false;
      }
      // Split the date into parts
      var parts = value.split("/");
      var date = new Date(
        parseInt(parts[2], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[0], 10)
      );
      if (
        date.getFullYear() !== parseInt(parts[2], 10) ||
        date.getMonth() !== parseInt(parts[1], 10) - 1 ||
        date.getDate() !== parseInt(parts[0], 10)
      ) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // GST Number Validation
    _LCvalidateGstNumber: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      oField.setValue(oField.getValue().toUpperCase());
      var regex =
        /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
      if (!regex.test(oField.getValue().toUpperCase())) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Mandatory Field Validation
    _LCvalidateMandatoryField: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      if (!oField.getValue().trim()) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },

    // Pin Code Validation (NEW FUNCTION ADDED)
    _LCvalidatePinCode: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      var oValue = oField
        .getValue()
        .replace(/[^0-9]/g, "")
        .slice(0, 6);

      if (oField.getValue() !== oValue) {
        oField.setValue(oValue);
      }

      var regex = /^\d{6}$/;
      if (!regex.test(oValue)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },
    _LCvalidatePassword: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;

      var oValue = oField.getValue();
      var regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;

      if (!regex.test(oValue)) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },
    // LUT Number Validation
    _LCvalidateLutNumber: function (oEvent, type) {
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      if (!oField) return false;
      oField.setValue(oField.getValue().toUpperCase());
      var regex = /^[A-Z0-9]{16}$/;
      if (!regex.test(oField.getValue().toUpperCase())) {
        oField.setValueState("Error");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },
    _LCvalidationComboBox: function (oEvent, type) {
      var aSelectedKeys =
        type === "ID"
          ? oEvent.getSelectedKeys()
          : [oEvent.getParameter("value")];
      var oField = type === "ID" ? oEvent : oEvent.getSource();
      aSelectedKeys =
        aSelectedKeys[0] === "" ? aSelectedKeys.slice(1) : aSelectedKeys;
      if (aSelectedKeys.length === 0) {
        oField.setValueState("Error");
        oField.setValueStateText("Please select at least one option");
        return false;
      } else {
        oField.setValueState("None");
        return true;
      }
    },
  };
});
