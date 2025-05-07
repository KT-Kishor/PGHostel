sap.ui.define([], function () {
    "use strict";
    return {
        formatDate: function (sDate) {

            if (sDate) {
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
                return oDateFormat.format(new Date(sDate));
            }
            return sDate;
        },


        formatCurrency: function (value, code) {
            if (value || value === 0) {
                var oCurrencyFormat = sap.ui.core.format.NumberFormat.getCurrencyInstance({
                    currencyCode: false // hides the currency code like "INR"
                });
                var formatted = oCurrencyFormat.format(value);
                return code ? formatted + " " + code : formatted;
            }
            return "";
        },

        formatCurrencyInINRText: function (sValue) {
            if (sValue || sValue === 0) {
                return "INR" + " " + parseFloat(sValue).toLocaleString('en-IN');
            }
            return "";
        },
        formatObjectStatus: function (sStatus) {
            switch (sStatus) {
                case "New":
                    return "Indication05";
                case "Renew":
                    return "Indication03";
                case "Active":
                    return "Success";
                case "Approved":
                    return "Success";
                case "Inactive":
                    return "Error";
                case "Rejected":
                    return "Error";
                case "Submitted":
                    return "Indication03";
                case "Company":
                    return "Indication13";
                case 'Employee':
                    return "Success";
                case 'Draft':
                    return "Indication17";
                case "OnBoarded":
                    return "Success";
                case "Rejected":
                    return "Error";
                case "Offer Sent":
                    return "Indication06";
                case "Invoiced":
                    return "Success";
                case "Payment Received":
                    return "Success";
                case "Invoice Sent":
                    return "Indication03";
                case "Send back by account":
                    return "Indication06";
                case "PDF Generated":
                    return "Indication18";
                case "Send back by manager":
                    return "Information";
                case "Paid":
                    return "Success";
                case "Available":
                    return "Indication14"
                case "Returned":
                    return "Indication14"
                case "Trashed":
                    return "Error"
                case "Assigned":
                    return "Warning"
                case "Transferred":
                    return "Indication13"
                case "Saved":
                    return "Indication03";
                default:
                    return "Indication01";

            }
        },

        formatGrade: function (value) {
            if (!value) {
                return "";
            }
            if (value.includes("Percentage")) {
                var data = value.split(" ")
                return data[0] + " " + "%";
            }
            return value;
        },

        companyInvoicePayByDate: function (payByDate, status) {
            var tenDay = 10;
            if (!payByDate) return "None";
            var parts = payByDate.split('/');
            var day = parseInt(parts[0], 10);
            var month = parseInt(parts[1], 10) - 1;
            var year = parseInt(parts[2], 10);
            var endDateObj = new Date(year, month, day);
            var now = new Date();

            var timeDiff = endDateObj - now;
            var daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (status === "Submitted") {
                return "Indication17";
            } else if (status === "Payment Received") {
                return "Success";
            } else if (status === "Invoice Sent" && daysDiff >= 0) {
                return "Warning";
            } else if (status === "Invoice Sent" && daysDiff <= 0) {
                return "Error";
            } else {
                return "Indication01";
            }
        },

        formatMaxDate: function () {
            var oDate = new Date()
            if (oDate) {
                return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());
            }
            return null;
        },

        formatMinDate: function () {
            var oDate = new Date()
            if (oDate) {
                return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());
            }
            return null;
        },

        fromatNumber: function (avalue) {
            if (avalue === "0" || avalue === 0) {
                return "0.00";
            }
            var numericValue = parseFloat(avalue);
            if (isNaN(numericValue)) {
                return "";
            }

            var oFormatOptions = {
                groupingBaseSize: 3,
                groupingSize: 2,
                minIntegerDigits: 1,
                minFractionDigits: 2,
                maxFractionDigits: 4
            };

            var oFloatFormat = sap.ui.core.format.NumberFormat.getFloatInstance(oFormatOptions);
            return oFloatFormat.format(numericValue);
        },

        fullNameFormatter: function (salutation, consultantName) {
            if (salutation && consultantName) {
                return salutation + " " + consultantName;
            }
            return consultantName || salutation;
        },

        YearlyToMontlyConv: function (value) {
            var Data = parseFloat(value);
            if (isNaN(Data)) {
                return "INR 0.00";
            }
            var oFormatOptions = {
                groupingBaseSize: 3,
                groupingSize: 2,
                minIntegerDigits: 1,
                minFractionDigits: 2,
                maxFractionDigits: 2
            };

            var oFloatFormat = sap.ui.core.format.NumberFormat.getFloatInstance(oFormatOptions);
            // return oFloatFormat.format(numericValue);
            var monthlyValue = Data / 12;
            return "INR " + oFloatFormat.format(monthlyValue);
        },
        formatGradeWithType: function (sGrade, sGradeType) {
            if (!sGrade || isNaN(sGrade)) return "";
            var formattedGrade = parseFloat(sGrade).toFixed(2);
            if (sGradeType === "Percentage") {
                return formattedGrade + " %";
            } else if (sGradeType === "CGPA") {
                return formattedGrade + " CGPA";
            } else {
                return formattedGrade;
            }
        },
        getImageSrc: function (base64Str) {
            if (base64Str) {
                return "data:image/png;base64," + base64Str;
            }
            return ""; // fallback
        },

    }
});