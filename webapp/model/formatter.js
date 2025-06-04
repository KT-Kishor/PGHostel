sap.ui.define([
     "sap/ui/core/format/DateFormat"
], function (DateFormat) {
    "use strict";
    return {
        formatDate: function (sDate) {

            if (sDate) {
                var oDateFormat = DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
                return oDateFormat.format(new Date(sDate));
            }
            return sDate;
        },

        formatMonthYear: function (sDateStr) {
            if (!sDateStr) return "";

            var oDate = new Date(sDateStr); // Convert ISO string to Date object
            var oDateFormat = sap.ui.core.format.DateFormat.getInstance({ pattern: "MM-yyyy" });

            return oDateFormat.format(oDate);
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
                case "Onboarded":
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
                    return "Success"
                case "Returned":
                    return "Success"
                case "Trashed":
                    return "Error"
                case "Assigned":
                    return "Information"
                case "Transferred":
                    return "Warning"
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
            if (!payByDate) return "None";

            var dueDate = new Date(payByDate);
            var today = new Date();

            // Reset time part for accurate comparison
            dueDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            var timeDiff = dueDate - today;
            var daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (status === "Submitted") {
                return "Indication17";
            } else if (status === "Payment Received") {
                return "Success";
            } else if (status === "Invoice Sent" && daysDiff >= 0) {
                return "Warning";
            } else if (status === "Invoice Sent" && daysDiff < 0) {
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

        formatCompanyAndDescription: function (companyName, description , startDate , EndDate) {
            if (companyName && description) {
                return companyName + " - " + description + " " +"("+ startDate+ " - " +EndDate + ")";
            } else if (companyName) {
                return companyName;
            } else if (description) {
                return description;
            } else {
                return "";
            }
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

        statusState: function (Status) {
            if (Status === "Active") {
                return "Success";
            } else {
                return "Error";
            }
        },

        formatTimelineDate: function (status, creationDate, assignedDate, returnDate, trashDate, transferDate) {
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });

            if (status === "Assigned" && assignedDate) {
                return oDateFormat.format(new Date(assignedDate));
            }
            else if (status === "Returned" && returnDate) {
                return oDateFormat.format(new Date(returnDate))

            } else if (status === "Trashed" && trashDate) {
                return oDateFormat.format(new Date(trashDate))

            }
            else if (status === "Transferred" && transferDate) {
                return oDateFormat.format(new Date(transferDate))

            }
            else if (creationDate) {
                return oDateFormat.format(new Date(creationDate))
            }

            else {
                return "Date not available";
            }
        },

         formatCustomerTypeValue: function (sType, sValue) {
            if (sValue && sValue !== "") {
                return `${sType} (${sValue}%)`;
            }
            return sType; 
        },

        formatId: function (status, pickId, assigneId) {
            if (status === "Assigned" && assigneId) {
                return assigneId;
            } else if (status === "Available" && pickId) {
                return pickId;
            } else {
                return " ";
            }
        },
        
        formatName: function (status, pickName, assigneByName, assigneName) {
            if (status === "Assigned" && assigneByName) {
                return assigneByName;
            } else if (status === "Available" && pickName) {
                return pickName;
            } else if (status === "Returned" && assigneName) {
                return assigneName;

            }
        }
    }
});
