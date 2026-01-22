sap.ui.define([], function() {
    "use strict";
    return {
        // Validate mobile number
        _LCvalidateMobileNumber: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            var oValue = oField.getValue().replace(/[^0-9]/g, "");
            if (oField.getValue() !== oValue) oField.setValue(oValue);
            var regex = /^[1-9]\d{9}$/;
            if (!regex.test(oValue)) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },
onNumber: function (oEvent, type) {
    var oField = type === "ID" ? oEvent : oEvent.getSource();
    if (!oField) return false;

    var sValue = oField.getValue();

    // Allow digits and only one dot
    var sFilteredValue = sValue
        .replace(/[^0-9.]/g, "")
        .replace(/(\..*)\./g, "$1");

    // Limit to 2 decimal places
    if (sFilteredValue.includes(".")) {
        var aParts = sFilteredValue.split(".");
        aParts[1] = aParts[1].slice(0, 2);
        sFilteredValue = aParts.join(".");
    }

    oField.setValue(sFilteredValue);


    if (
        sFilteredValue === "" ||
        sFilteredValue === "." ||
        sFilteredValue.endsWith(".")
    ) {
        oField.setValueState("Error");
        return false;
    }

    // ✅ VALID
    oField.setValueState("None");
    return true;
},

        // Validate mobile number
        _LCvalidateMobileNumberWithSTD: function(oEventOrControl, sStdCode) {
        var oField = (typeof oEventOrControl.getSource === "function")
        ? oEventOrControl.getSource() : oEventOrControl;              
            var oValue = oField.getValue().replace(/[^0-9]/g, "");
            oField.setValue(oValue);
            var isValid = true;
            if (sStdCode === "+91") {
                var regexIndia = /^[1-9]\d{9}$/;
                if (!regexIndia.test(oValue)) {
                    isValid = false;
                    oField.setValueState("Error").focus();
                }
            } else {
                if (!oValue) {
                    isValid = false;
                    oField.setValueState("Error").focus();
                }
            }
            if (isValid) {
                oField.setValueState("None");
            }
            return isValid;
        },

        // Email validation function
        _LCvalidateEmail: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            var sValue = oField.getValue();
            if (!sValue) {
                oField.setValueState("Error").focus();
                return false;
            }
            // Split emails by comma, semicolon, or space
            var aEmails = sValue.split(/[,;]+/).map(email => email).filter(email => email);
            var regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            var bAllValid = aEmails.every(email => regex.test(email));
            if (!bAllValid) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        _LCvalidateName: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            var oValue = oField.getValue().trim();
            if (oValue === "") {
                oField.setValueState("Error").focus();
                return false;
            }
            // Allow only letters, spaces, and dots
            var sanitizedValue = oValue.replace(/[^a-zA-Z\s./]/g, "");
            if (oValue !== sanitizedValue) oField.setValue(sanitizedValue);
            var regex = /^[a-zA-Z\s./]+$/;
            if (!regex.test(sanitizedValue)) {
                oField.setValueState("Error").focus();
                return false;
            }
            var letterCount = (sanitizedValue.match(/[a-zA-Z]/g) || []).length;
            if (letterCount < 2) {
                oField.setValueState("Error").focus();
                return false;
            }
            oField.setValueState("None");
            return true;
        },

        // Amount validation function
        _LCvalidateAmount: function (oEvent, type) {
            var oInput = type === "ID" ? oEvent : oEvent.getSource();
            var value = oInput.getValue();

            // 1️⃣ Block invalid characters (only digits + one dot)
            value = value.replace(/[^0-9.]/g, "");     // remove non-numeric except dot
            value = value.replace(/(\..*)\./g, "$1");  // no more than one dot

            // 2️⃣ Allow only 2 decimals while typing
            if (value.includes(".")) {
                let parts = value.split(".");
                parts[1] = parts[1].substring(0, 2);   // limit decimals to 2
                value = parts.join(".");
            }

            // Update UI immediately
            oInput.setValue(value);

            // 3️⃣ Validation
            if (value === "" || parseFloat(value) < 0) {
                oInput.setValueState("Error");
                return false;
            }

            if (!/^\d+(\.\d{1,2})?$/.test(value)) {
                oInput.setValueState("Error");
                return false;
            }

            oInput.setValueState("None");
            return true;
        },

        _LCvalidateAmountZeroTaking: function(oEvent, type) {
            var oInput = type === "ID" ? (oInput = oEvent) : (oInput = oEvent.getSource());
            var value = oInput.getValue();
            var cleanedValue = value.replace(/[^0-9.]/g, "");

            oInput.setValue(cleanedValue);

            if (!/^\d+(\.\d+)?$/.test(cleanedValue)) {
                oInput.setValueState("Error").focus();
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },

        _LCvalidateJoiningBonus: function(oEvent, type) {
            var oInput = type === "ID" ? oEvent : oEvent.getSource();
            var value = oInput.getValue();
            var cleanedValue = value.replace(/[^0-9.]/g, "");
            var parts = cleanedValue.split(".");
            // Limit to 2 decimal places
            if (parts.length === 2) {
                cleanedValue = parts[0] + "." + parts[1].slice(0, 2);
            }
            oInput.setValue(cleanedValue);
            // Allow 0 or positive decimal numbers
            if (!/^\d+(\.\d{1,2})?$/.test(cleanedValue)) {
                oInput.setValueState("Error").focus();
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },

        // PAN card validation function
        _LCvalidatePanCard: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            oField.setValue(oField.getValue().trim().toUpperCase());
            var regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!regex.test(oField.getValue().trim().toUpperCase())) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        // IFSC code validation
        _LCvalidateIfcCode: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            oField.setValue(oField.getValue().trim().toUpperCase());
            var regex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            if (!regex.test(oField.getValue().trim().toUpperCase())) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        // Aadhar card validation
        _LCvalidateAadharCard: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            var oValue = oField.getValue().replace(/[^0-9]/g, "").slice(0, 12);
            if (oField.getValue() !== oValue) oField.setValue(oValue);
            var regex = /^[0-9]{12}$/;
            if (!regex.test(oValue)) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        // Voter ID validation
        _LCvalidateVoterId: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            var value = oField.getValue().trim().toUpperCase();
            oField.setValue(value);
            var regex = /^[A-Z]{3,4}[0-9]{7,8}$/;
            if (!regex.test(value)) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        // Passport validation
        _LCvalidatePassport: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            var value = oField.getValue().trim().toUpperCase();
            oField.setValue(value);
            var regex = /^[A-PR-WY][1-9]\d\s?\d{4}[1-9]$/;
            if (!regex.test(value)) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        // Account No Validation
        _LCvalidateAccountNo: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            var oValue = oField.getValue().replace(/[^0-9]/g, "").slice(0, 18);
            if (oField.getValue() !== oValue) oField.setValue(oValue);
            var regex = /^[0-9]{9,18}$/;
            if (!regex.test(oValue)) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        // Date validation function
        _LCvalidateDate: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            var value = oField.getValue().trim();
            var regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(\d{4})$/;
            if (!regex.test(value)) {
                oField.setValueState("Error").focus();
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
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        // GST Number Validation
        _LCvalidateGstNumber: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            oField.setValue(oField.getValue().toUpperCase());
            var regex = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
            if (!regex.test(oField.getValue().toUpperCase())) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        // Mandatory Field Validation
        _LCvalidateMandatoryField: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            var oValue = oField.getValue().trim();
            if (!oValue) {
                oField.setValueState("Error").focus();
                oField.focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        _LCvalidateCTC: function(oEvent, type) {
            var oInput = type === "ID" ? oEvent : oEvent.getSource();
            var value = oInput.getValue().replace(/[^0-9.]/g, "");
            var parts = value.split(".");
            if (parts.length === 2) {
                value = parts[0] + "." + parts[1].slice(0, 2);
            }
            oInput.setValue(value);
            var num = parseFloat(value);
            if (!/^\d+(\.\d{1,2})?$/.test(value) || isNaN(num) || num < 50000) {
                oInput.setValueState("Error").focus();
                return false;
            }
            oInput.setValueState("None");
            return true;
        },

        // Pin Code Validation (NEW FUNCTION ADDED)
        _LCvalidatePinCode: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            var oValue = oField.getValue().replace(/[^0-9]/g, "").slice(0, 6);

            if (oField.getValue() !== oValue) {
                oField.setValue(oValue);
            }
            var regex = /^\d{6}$/;
            if (!regex.test(oValue)) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        // _LCvalidatePassword: function(oEvent, type) {
        //     var oField = type === "ID" ? oEvent : oEvent.getSource();
        //     if (!oField) return false;

        //     var oValue = oField.getValue();
        //     var regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*+-])[A-Za-z\d!+-@#$%^&*()_=]{6,}$/;

        //     if (!regex.test(oValue)) {
        //         oField.setValueState("Error").focus();
        //         return false;
        //     } else {
        //         oField.setValueState("None");
        //         return true;
        //     }
        // },

_LCgenerateStrongPassword: function () {

    var charsUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var charsLower = "abcdefghijklmnopqrstuvwxyz";
    var charsDigits = "0123456789";
    var charsSpecial = "!@#$%^&*()_-+=";

    function pick(set) {
        return set[Math.floor(Math.random() * set.length)];
    }

    var pwdArr = [];

    // ensure rule compliance
    pwdArr.push(pick(charsUpper));
    pwdArr.push(pick(charsLower));
    pwdArr.push(pick(charsDigits));
    pwdArr.push(pick(charsDigits));
    pwdArr.push(pick(charsSpecial));
    pwdArr.push(pick(charsSpecial));

    var all = charsUpper + charsLower + charsDigits + charsSpecial;

    // fill remaining length randomly
    while (pwdArr.length < 12) {
        pwdArr.push(pick(all));
    }

    // shuffle
    pwdArr.sort(() => Math.random() - 0.5);

    // 🔒 FINAL SAFETY NET — ABSOLUTE
    return pwdArr.join("").replace(/\s/g, "");
},

_LCvalidatePassword: function (oEventOrInput, oStrengthText) {

            // 1️⃣ Normalize first argument: event OR Input control
            var oField =
                (oEventOrInput && typeof oEventOrInput.getSource === "function")
                    ? oEventOrInput.getSource()   // liveChange event
                    : oEventOrInput;              // direct Input control

            if (!oField || !oField.getValue) {
                return false;
            }

            var pwd = (oField.getValue() || "").trim();
            var strength = this._getPasswordStrength(pwd);

            var map = {
                poor: { cls: "pwdMinFail", txt: "Strength: Poor" },
                weak: { cls: "pwdWeak", txt: "Strength: Weak" },
                medium: { cls: "pwdMedium", txt: "Strength: Medium" },
                strong: { cls: "pwdStrong", txt: "Strength: Strong" }
            };

            // 2️⃣ Update strength label ONLY if provided
            if (oStrengthText && oStrengthText.setText) {
                oStrengthText.setText(map[strength].txt);
                oStrengthText.removeStyleClass("pwdMinFail pwdWeak pwdMedium pwdStrong");
                oStrengthText.addStyleClass(map[strength].cls);
            }

            // 3️⃣ Input value state (global behaviour)
            oField.setValueState(
                strength === "poor" ? "Error" :
                    strength === "strong" ? "None" :
                        "None"
            );

            // 4️⃣ Only "poor" is rejected
            return strength !== "poor";
        },

_getPasswordStrength: function(pwd) {

    if (!pwd) return "poor";

    // ❌ SPACES ARE IMMEDIATE FAILURE
    if (/\s/.test(pwd)) {
        return "poor";
    }
    var length  = pwd.length;
    var upper   = /[A-Z]/.test(pwd);
    var lower   = /[a-z]/.test(pwd);
    var digits  = pwd.match(/\d/g) || [];
    var special = pwd.match(/[!@#$%^&*()_\-+=]/g) || [];

    var commonPatterns = /(1234|abcd|password|qwerty|1111)/i.test(pwd);
    var repeated = /(.)\1\1/.test(pwd);

    // Minimum validity check
    if (upper && lower && digits.length >= 1 && special.length >= 1) {

        if (length >= 12 && digits.length >= 2 && special.length >= 2 && !repeated && !commonPatterns) {
            return "strong";
        }

        if (length >= 10 && digits.length >= 2 && !repeated) {
            return "medium";
        }

        if (length >= 6) {
            return "weak";
        }
    }

    return "poor";
},

        // _LCvalidatePassword: function (oEventOrInput) {
        //     // Detect whether event or direct Input control was passed
        //     var oField = (oEventOrInput.getSource)
        //         ? oEventOrInput.getSource()      // liveChange event
        //         : oEventOrInput;                // direct control

        //     if (!oField || !oField.getValue) return false;

        //     var oValue = oField.getValue().trim();

        //     // Strong password rule
        //     var regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*+\-])[A-Za-z\d!+\-@#$%^&*()_=]{6,}$/;

        //     if (!regex.test(oValue)) {
        //         oField.setValueState("Error");
        //         oField.setValueStateText("Password must contain uppercase and special character, min 6 chars");
        //         return false;
        //     } else {
        //         oField.setValueState("None");
        //         return true;
        //     }
        // },


        // LUT Number Validation
        _LCvalidateLutNumber: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            oField.setValue(oField.getValue().toUpperCase());
            var regex = /^[A-Z0-9]{16}$/;
            if (!regex.test(oField.getValue().toUpperCase())) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        _LCvalidateVariablePay: function(oEvent, type) {
            var oInput = type === "ID" ? oEvent : oEvent.getSource();
            var value = oInput.getValue();
            var cleanedValue = value.replace(/[^0-9.]/g, "");
            var parts = cleanedValue.split(".");
            if (parts.length === 2) {
                cleanedValue = parts[0] + "." + parts[1].slice(0, 2);
            }
            oInput.setValue(cleanedValue);
            var isValidFormat = /^\d+(\.\d{1,2})?$/.test(cleanedValue);
            var numValue = parseFloat(cleanedValue);
            if (!isValidFormat || isNaN(numValue) || numValue < 0 || numValue > 20) {
                oInput.setValueState("Error").focus();
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },

        _LCvalidationComboBox: function(oEvent, type) {
            var aSelectedKeys =
                type === "ID" ?
                oEvent.getSelectedKeys() : [oEvent.getParameter("value")];
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            aSelectedKeys =
                aSelectedKeys[0] === "" ? aSelectedKeys.slice(1) : aSelectedKeys;
            if (aSelectedKeys.length === 0) {
                oField.setValueState("Error").focus();
                oField.setValueStateText("Please Select at Least One Option");
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        _LCvalidateGrade: function(oEventOrField, type, sGradeTypeId) {
            var oField = (type === "ID") ? oEventOrField : oEventOrField.getSource();
            if (!oField) return false;

            var sGradeValue = oField.getValue().trim();
            var cleanValue = sGradeValue.replace(/[^0-9.]/g, '');
            oField.setValue(cleanValue);

            if (!cleanValue) {
                oField.setValueState("Error");
                return false;
            }

            var regex = /^\d{1,5}(\.\d{1,2})?$/;
            if (!regex.test(cleanValue) || isNaN(cleanValue)) {
                oField.setValueState("Error").focus();
                oField.setValueStateText("Enter a Valid Number with up to 2 Decimal Places.");
                return false;
            }

            var fGrade = parseFloat(cleanValue);
            var sGradeType = sap.ui.getCore().byId(sGradeTypeId)?.getSelectedKey() || "";
            var bIsValid = false;

            if (sGradeType === "Percentage") {
                bIsValid = fGrade >= 0 && fGrade <= 100;
            } else if (sGradeType === "CGPA") {
                bIsValid = fGrade >= 0 && fGrade <= 10;
            }

            if (bIsValid) {
                oField.setValueState("None");
                return true;
            } else {
                oField.setValueState("Error").focus();
                var sErrorMsg = (sGradeType === "Percentage") ?
                    "Grade must be between 0 and 100 for Percentage." :
                    "Grade must be between 0 and 10 for CGPA.";
                oField.setValueStateText(sErrorMsg);
                return false;
            }
        },

        _LCvalidateTimeLimit: function(oEvent, type) {
            var oField = type === "ID" ? oEvent : oEvent.getSource();
            if (!oField) return false;
            var value = parseFloat(oField.getValue());
            if (isNaN(value) || value <= 0 || value > 8) {
                oField.setValueState("Error").focus();
                return false;
            } else {
                oField.setValueState("None");
                return true;
            }
        },

        _LCvalidateTraineeAmount: function(oEvent, type) {
            var oInput = type === "ID" ? oEvent : oEvent.getSource();
            var value = oInput.getValue().trim();

            // Remove invalid characters
            var cleanedValue = value.replace(/[^0-9.]/g, "");

            // Set cleaned value back to input
            oInput.setValue(cleanedValue);

            // Regex: Up to 2 digits before decimal, optional decimal, up to 2 digits after decimal
            var validFormat = /^(?:\d{1,2})(?:\.\d{1,2})?$/;

            // Check for value within 0-99.99 range and match regex
            if (!validFormat.test(cleanedValue) || parseFloat(cleanedValue) > 99.99) {
                oInput.setValueState("Error").focus();
                return false;
            } else {
                oInput.setValueState("None");
                return true;
            }
        },

        _LCvalidateMultipleDecimal: function(oEvent, type) {
            var oInput = type === "ID" ? oEvent : oEvent.getSource();
            var value = oInput.getValue().trim();

            // Remove all characters except digits and dot
            var cleanedValue = value.replace(/[^0-9.]/g, "");

            // Ensure only one decimal point is allowed
            var parts = cleanedValue.split(".");
            if (parts.length > 2) {
                cleanedValue = parts[0] + "." + parts.slice(1).join(""); // keep first dot, merge rest
            }

            // Set cleaned value back to input
            oInput.setValue(cleanedValue);

            // Check if it's a valid float number
            if (isNaN(cleanedValue)) {
                oInput.setValueState("Error").focus();
                return false;
            }

            oInput.setValueState("None");
            return true;
        },

        _LCstrictValidationComboBox: function(oEvent, type) {
            var oComboBox = type === "ID" ? oEvent : oEvent.getSource();
            var sValue = oComboBox.getValue();
            if (!sValue) {
                oComboBox.setValueState("Error").focus();
                return false;
            }
            var aItems = oComboBox.getItems();
            var bValid = aItems.some(function(oItem) {
                return oItem.getText() === sValue || oItem.getKey() === sValue;
            });
            if (!bValid) {
                oComboBox.setValueState("Error").focus();
                return false;
            } else {
                oComboBox.setValueState("None");
                return true;
            }
        },

        // Strict validation for Select control (like ComboBox strict)
        _LCstrictValidationSelect: function (oField) {
            if (!oField) return false;
            let key = oField.getSelectedKey();
            if (!key) {
                oField.setValueState("Error");
                oField.setValueStateText("Please Select Value");
                return false;
            }
            oField.setValueState("None");
            return true;
        },

        // Mandatory TextArea validation
        _LCvalidateAddress: function (oField) {
            if (!oField) return false;
            let v = (oField.getValue() || "").trim();
            if (!v) {
                oField.setValueState("Error");
                oField.setValueStateText("Address is Required");
                return false;
            }
            oField.setValueState("None");
            return true;
        },

        _LCvalidateISDmobile: function (oEventOrControl, sStdCode) {
            var oField =
                (typeof oEventOrControl.getSource === "function")
                    ? oEventOrControl.getSource()
                    : oEventOrControl;

            var oValue = oField.getValue().replace(/\D/g, "");
            oField.setValue(oValue);

            var isValid = true;

            if (sStdCode === "+91") {

                // 🇮🇳 India = exactly 10 digits
                var regexIndia = /^[1-9]\d{9}$/;
                if (!regexIndia.test(oValue)) {
                    isValid = false;
                }

            } else {

                // 🌍 International = 4–18 digits
                var intlRegex = /^\d{4,18}$/;
                if (!intlRegex.test(oValue)) {
                    isValid = false;
                }
            }

            if (!isValid) {
                oField.setValueState("Error");
                oField.setValueStateText("Enter Valid Mobile Number");
            } else {
                oField.setValueState("None");
            }

            return isValid;
        },

        _LCstrictValidationMultiComboBox: function (oEvent, type) {
            var oMultiComboBox = type === "ID" ? oEvent : oEvent.getSource();

            // Get selected keys
            var aSelectedKeys = oMultiComboBox.getSelectedKeys();

            // Mandatory check
            if (!aSelectedKeys || !aSelectedKeys.length) {
                oMultiComboBox.setValueState("Error").focus();
                return false;
            }

            // Validate selected keys against items
            var aItems = oMultiComboBox.getItems();
            var bValid = aSelectedKeys.every(function (sKey) {
                return aItems.some(function (oItem) {
                    return oItem.getKey() === sKey;
                });
            });

            if (!bValid) {
                oMultiComboBox.setValueState("Error").focus();
                return false;
            } else {
                oMultiComboBox.setValueState("None");
                return true;
            }
        }

    };
});