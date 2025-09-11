sap.ui.define(
  [
    "./BaseController", // Import BaseController
    "sap/ui/model/json/JSONModel", // JSON model for data handling
    "sap/m/MessageToast", // Import MessageToast for notifications
    "../utils/validation", // Custom validation utilities
    "../model/formatter", // Custom formatter functions
    "sap/m/MessageBox", //Import MessageBox for alerts/confirmations
    "sap/suite/ui/commons/Timeline", // Import Timeline for displaying comments
    "sap/suite/ui/commons/TimelineItem", //Import TimelineItem for individual comments
    "sap/ui/export/Spreadsheet",
  ],
  function (BaseController, JSONModel, MessageToast, utils, Formatter, MessageBox, Timeline, TimelineItem, Spreadsheet) {
    "use strict";

    return BaseController.extend("sap.kt.minihrsolution.controller.compOff", {
      onInit: function () {
        this.getRouter().getRoute("RouteCompOff").attachMatched(this._onRouteMatched, this);
      },

      onPressback: function () {
        this.getRouter().navTo("RouteTilePage"); // Navigate to tile page
      },
      onLogout: function () {
        this.CommonLogoutFunction();
      },


//  Helper: Fetch and filter CompOff data
_fetchCompOffData: async function (
    entityName = "InboxDetails",
    modelName = "LeaveModel",
    params = {}
) {
    try {
        let oFilter = {};

        // Default filters (Admin vs Employee)
        if (this.Type === "Admin") {
            oFilter.Type = "compOff";
        } else {
            oFilter.EmpID = this.userId;
            oFilter.Type = "compOff";
        }

        // Merge extra filters (from FilterBar)
        if (params.fromDate && params.toDate) {
            oFilter.fromDate = params.fromDate;
            oFilter.toDate = params.toDate;
        }

        if (params.empId) {
            oFilter.EmpID = params.empId;
        }

        // Fetch from backend with combined filters
        await this._fetchCommonData(entityName, modelName, oFilter);

        // After data comes back, filter by SubType = CompOff
        const aData = this.getOwnerComponent().getModel(modelName).getData() || [];
        const aFiltered = aData.filter(item => item.SubType === "CompOff");

        // Replace model data with filtered result
        this.getOwnerComponent().getModel(modelName).setData(aFiltered);

    } catch (err) {
        sap.m.MessageToast.show(err.message || "Error fetching CompOff data");
        throw err;
    }
},



// _fetchCompOffData: async function (entityName = "InboxDetails", modelName = "LeaveModel") {
//     let oFilter = {};
//     if (this.Type === "Admin") {
//         // Admin → see all Leave records
//         oFilter = { Type: "CompOff" };
//     } else {
//         // Employee → only their own Leave records
//         oFilter = { EmpID: this.userId, Type: "CompOff" };
//     }

//     // Call existing fetch
//     await this._fetchCommonData(entityName, modelName, oFilter);

//     // Client-side filter for CompOff only
//     const aData = this.getOwnerComponent().getModel(modelName).getData() || [];
//     const aFiltered = aData.filter(item => item.SubType === "CompOff");

//     // Replace model data with filtered result
//     this.getOwnerComponent().getModel(modelName).setData(aFiltered);
// },


    
      _onRouteMatched: async function () {
        const oOwnerComponent = this.getOwnerComponent();

        try {
          // Initialize common data and UI properties
          this.i18nModel = oOwnerComponent.getModel("i18n").getResourceBundle();
          this.initializeBirthdayCarousel();

          const bIsLoggedIn = await this.commonLoginFunction("compOff");
          if (!bIsLoggedIn) {
            return;
          }

          this.getBusyDialog();

          // Get and set user-specific data from the LoginModel
          const oLoginModel = oOwnerComponent.getModel("LoginModel");
          this.userId = oLoginModel.getProperty("/EmployeeID");
          this.Type = oLoginModel.getProperty("/Role");
          this.branch = oLoginModel.getProperty("/BranchCode");
          this.currentYear = new Date().getFullYear();

          // Set UI visibility and properties
          // this.byId("AL_id_LeaveBarChart").setVisible(false);
          this.byId("AL_id_compOffTableStandard").setVisible(true);
          this.byId("AL_id_compofffilterbar").setVisible(true);
          // this.byId("AL_id_LeaveYear").setSelectedKey(this.currentYear);
          this.onClearAndSearch("AL_id_compofffilterbar");
          this._makeDatePickersReadOnly(["AL_id_compoff_DateRangeSelection"]);










await this._fetchCompOffData();

const aData = this.getView().getModel("LeaveModel").getData();

// Deduplicate by EmpID
const oSeen = {};
const aUnique = aData.filter(item => {
    if (oSeen[item.EmpID]) {
        return false;
    }
    oSeen[item.EmpID] = true;
    return true;
});

// Store as a new property in the model
this.getView().getModel("LeaveModel").setProperty("/uniqueEmployees", aUnique);
const oDateRange = this.byId("AL_id_compoff_DateRangeSelection");

    const oToday = new Date();

    // Min date = 1 year back
    const oMinDate = new Date(oToday);
    oMinDate.setFullYear(oToday.getFullYear() - 1);

    // Max date = 1 year ahead
    const oMaxDate = new Date(oToday);
    oMaxDate.setFullYear(oToday.getFullYear() + 1);

    oDateRange.setMinDate(oMinDate);
    oDateRange.setMaxDate(oMaxDate);


   
          await this._fetchCommonData("LeaveType", "leaveTypeModel", { type: "Employee" });

          // Set header text and models
          const i18n = this.getView().getModel("i18n")?.getResourceBundle();
          oLoginModel.setProperty("/HeaderName", i18n.getText("compoffheader"));
          this.getView().setModel(new JSONModel({ selectedType: 1 }), "selectedModel");
          this.getView().setModel(new JSONModel({ Name: "line", type: "column", AllStatus: "column" }), "MonthlyBar");

          await this._fetchCommonData("ListOfSateData", "HolidayModel", { branchCode: this.branch });
          // await this.BarDisplayFunction("All In One Leave", this.currentYear, this.userId);

          // Employee detail call
          // await this.EmployeeDetReadCall("EmployeeDetails", { EmployeeID: this.userId });
        } catch (error) {
          MessageToast.show(error.message || error.responseText);
        } finally {
          this.closeBusyDialog();
        }
      },
      // EmployeeDetReadCall: async function (entity, value) {
      //   try { this
      //     let data = await this.ajaxReadWithJQuery(entity, value);
      //     if (data && data.data && data.data.length > 0) {
      //       let joiningDateField = entity === "Trainee" ? "JoiningDate" : "JoiningDate";
      //       this.JoiningDate = this.Formatter.formatDate(data.data[0][joiningDateField]).split("/").map(Number);
      //       let addYears = [];
      //       let length = new Date().getFullYear() - this.JoiningDate[2];
      //       for (let i = 0; i <= length; i++) {
      //         addYears.push({ key: this.JoiningDate[2] + i, text: this.JoiningDate[2] + i });
      //         // addYears.push(this.JoiningDate[2] + i);
      //       }
      //       let yearModel = new JSONModel({ items: addYears });
      //       this.getView().setModel(yearModel, "YearModel");
      //     } else {
      //       MessageToast.show(this.i18nModel.getText("joiningDateMissing"));
      //     }
      //   } catch (error) {
      //     MessageToast.show(error.message || error.responseText);
      //   }
      // },

      // Submit leave handler
AL_onPressSubmit: async function () {
    try {
        // Validate fields
        if (utils._LCstrictValidationComboBox(sap.ui.getCore().byId("AL_id_compoff_Leavetype"), "ID") && 
        utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_CF_FromDate"), "ID") && 
        utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_CF_ToDate"), "ID") && 
        utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AL_id_CompoffComments"), "ID")) {
            var oData = this.getView().getModel("LeaveTempModel").getData();

            // Parse dates
            var fromDateParts = oData.fromDate.split("/").map(Number);
            var startDate = new Date(fromDateParts[2], fromDateParts[1] - 1, fromDateParts[0]);
            var toDateParts = oData.toDate.split("/").map(Number);
            var endDate = new Date(toDateParts[2], toDateParts[1] - 1, toDateParts[0]);

            var currentDate = new Date();
            var jan31 = new Date(currentDate.getFullYear(), 0, 31);
            var isFromLastYear = fromDateParts[2] === currentDate.getFullYear() - 1;
            var isToLastYear = toDateParts[2] === currentDate.getFullYear() - 1;
            var isCurrentYear = fromDateParts[2] === currentDate.getFullYear() && toDateParts[2] === currentDate.getFullYear();
           if (!(isCurrentYear || (isFromLastYear && isToLastYear && currentDate <= jan31))) {
                return MessageBox.error(this.i18nModel.getText("leaveSameYear"));
            }

            // Check if leave is on holiday
            if (oData.fromDate === oData.toDate) {
                var holidays = this.getView().getModel("HolidayModel").getData();
                console.log("HolidayModel:", this.getView().getModel("HolidayModel"));

                var isHoliday = holidays.some((holiday) => {
                    var holidayDate = new Date(holiday.Date);
                    holidayDate.setHours(0, 0, 0, 0);
                    startDate.setHours(0, 0, 0, 0);
                    return holidayDate.getTime() === startDate.getTime();
                });
                if (isHoliday) {
                    return MessageBox.error(this.i18nModel.getText("holidaysMess"));
                }
            }

            if (parseFloat(oData.NoofDays) <= 0) {
                return MessageBox.error(this.i18nModel.getText("holidaysMess"));
            }

            // // Weekend validation (if <= 2 days)
            // if (parseFloat(oData.NoofDays) <= 2) {
            //     var isFromWeekend = startDate.getDay() === 0 || startDate.getDay() === 6;
            //     var isToWeekend = endDate.getDay() === 0 || endDate.getDay() === 6;
            //     if (isFromWeekend && isToWeekend) {
            //         return MessageBox.error(this.i18nModel.getText("holidaysMess"));
            //     }
            // }
            const currentDateNew = new Date();
const firstOfMonth = new Date(currentDateNew.getFullYear(), currentDateNew.getMonth(), 1);
const lastOfMonth = new Date(currentDateNew.getFullYear(), currentDateNew.getMonth() + 1, 0);

            if (startDate < firstOfMonth || startDate > lastOfMonth ||
    endDate < firstOfMonth || endDate > lastOfMonth) {
    return MessageBox.error("Comp-Off must be within the current month.");
}

            // Always Comp Off
            oData.typeOfLeave = "CompOff";
            oData.fromDate = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().split("T")[0];
            oData.toDate = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().split("T")[0];
            oData.status = "Submitted";

            // Clean unnecessary props
            delete oData.Save;
            delete oData.Submit;
            delete oData.MinToDate;
            delete oData.maxDate;
            delete oData.minDate;
            delete oData.isUpdate;

            this.getBusyDialog(); // Show busy dialog

            // Submit to backend
            this.ajaxCreateWithJQuery("CompOff", { data: oData })
                .then(async (response) => {
                    this.closeBusyDialog();
                    this._handleResponse(response, "leaveSubmitted");
await this._fetchCompOffData();


                })
                .catch((error) => {
                    this.closeBusyDialog();
                    MessageToast.show(error.message || error.responseText);
                });

        } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
        }
    } catch (error) {
        this.closeBusyDialog();
        MessageToast.show(error.message || error.responseText);
    }
},

      AL_onPressApplyLeave: function () {
        const oView = this.getView();
        const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
        const loginData = oLoginModel.getData();

        // Joining date validation
        // if (!this.JoiningDate || this.JoiningDate.length < 3) {
        //   MessageToast.show("Joining date is not available or invalid.");
        //   return;
        // }

        // const [joiningDay, joiningMonth, joiningYear] = this.JoiningDate.map(Number);
        // const currentYear = new Date().getFullYear();

        // Check if joining year is in the future
        // if (joiningYear > currentYear) {
        //   MessageToast.show("Joining year is in the future. You cannot apply leave for future year.");
        //   return;
        // }

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

const leaveJson = {
    employeeID: loginData.EmployeeID,
    employeeName: loginData.EmployeeName,
    email: loginData.EmailID,
    fromDate: "",
    toDate: "",
    NoofDays: "",
    typeOfLeave: "CompOff",
    Comments: "",
    Submit: true,
    Save: false,
    halfDay: false,
    MinToDate: firstOfMonth,
    minDate: firstOfMonth,
    maxDate: lastOfMonth,
    isUpdate: false,
};

oView.setModel(new JSONModel(leaveJson), "LeaveTempModel");

// Apply limits to the datepickers
const oFromDate = sap.ui.getCore().byId("AL_id_CF_FromDate");
const oToDate = sap.ui.getCore().byId("AL_id_CF_ToDate");
if (oFromDate && oToDate) {
    oFromDate.setMinDate(firstOfMonth);
    oFromDate.setMaxDate(lastOfMonth);

    oToDate.setMinDate(firstOfMonth);
    oToDate.setMaxDate(lastOfMonth);
}

this.openLeaveDialog(oView);
      },
      


AL_onPressSave: async function () {
    try {
        // Safely get controls
        const oLeaveType = sap.ui.getCore().byId("AL_id_compoff_Leavetype");
        const oFromDate = sap.ui.getCore().byId("AL_id_CF_FromDate");
        const oToDate = sap.ui.getCore().byId("AL_id_CF_ToDate");
        const oComments = sap.ui.getCore().byId("AL_id_CompoffComments");

        if (!oLeaveType || !oFromDate || !oToDate || !oComments) {
            return MessageToast.show("Required fields are not ready yet.");
        }

        // Validate fields
        if (!utils._LCstrictValidationComboBox(oLeaveType, "ID") ||
            !utils._LCvalidateDate(oFromDate, "ID") ||
            !utils._LCvalidateDate(oToDate, "ID") ||
            !utils._LCvalidateMandatoryField(oComments, "ID")) {
            return;
        }

        const oData = this.getView().getModel("LeaveTempModel")?.getData();
        if (!oData) return MessageToast.show("Leave data not found.");

        // Parse dates
        const fromDateParts = (oData.fromDate || "").split("/").map(Number);
        const toDateParts = (oData.toDate || "").split("/").map(Number);
        if (fromDateParts.length !== 3 || toDateParts.length !== 3) return MessageToast.show("Invalid date format.");

        const startDate = new Date(fromDateParts[2], fromDateParts[1] - 1, fromDateParts[0]);
        const endDate = new Date(toDateParts[2], toDateParts[1] - 1, toDateParts[0]);

        // Allow last year leave only until Jan 31
        const currentDate = new Date();
        const jan31 = new Date(currentDate.getFullYear(), 0, 31);
        const isFromLastYear = fromDateParts[2] === currentDate.getFullYear() - 1;
        const isToLastYear = toDateParts[2] === currentDate.getFullYear() - 1;
        const isCurrentYear = fromDateParts[2] === currentDate.getFullYear() && toDateParts[2] === currentDate.getFullYear();
        if (!(isCurrentYear || (isFromLastYear && isToLastYear && currentDate <= jan31))) {
            return MessageBox.error(this.i18nModel.getText("leaveSameYear"));
        }

        // Check holiday
        const holidays = this.getView().getModel("HolidayModel")?.getData() || [];
        if (oData.fromDate === oData.toDate) {
            const isHoliday = holidays.some(h => new Date(h.Date).toDateString() === startDate.toDateString());
            if (isHoliday) return MessageBox.error(this.i18nModel.getText("holidaysMess"));
        }

        // Validate number of days
        if (parseFloat(oData.NoofDays) <= 0) return MessageBox.error(this.i18nModel.getText("holidaysMess"));

        // Check weekend for small leaves
        if (parseFloat(oData.NoofDays) <= 2) {
            const isFromWeekend = startDate.getDay() === 0 || startDate.getDay() === 6;
            const isToWeekend = endDate.getDay() === 0 || endDate.getDay() === 6;
            if (isFromWeekend && isToWeekend) return MessageBox.error(this.i18nModel.getText("holidaysMess"));
        }

        // Initialize appliedLeavesSet safely
        if (!this.appliedLeavesSet) this.appliedLeavesSet = new Set(this.previousLeaveDates || []);

        // Check already applied leave
        if (this.isLeaveAlreadyApplied(oData.fromDate, oData.toDate, this.previousLeaveDates)) {
            return MessageBox.error(this.i18nModel.getText("leaveAlreadyApplied"));
        }


                    const currentDateNew = new Date();
const firstOfMonth = new Date(currentDateNew.getFullYear(), currentDateNew.getMonth(), 1);
const lastOfMonth = new Date(currentDateNew.getFullYear(), currentDateNew.getMonth() + 1, 0);

            if (startDate < firstOfMonth || startDate > lastOfMonth ||
    endDate < firstOfMonth || endDate > lastOfMonth) {
    return MessageBox.error("Comp-Off must be within the current month.");
}

        // Quota and leave calculation
        const LeaveModel = this.getView().getModel("LeaveModel")?.getData() || [];
        const filteredData = LeaveModel.filter(item => {
            if (item.typeOfLeave !== "All In One Leave") return false;
            const from = this.onFormatDate(this.Formatter.formatDate(item.fromDate));
            const to = this.onFormatDate(this.Formatter.formatDate(item.toDate));
            const startOfYear = new Date(this.currentYear, 0, 1);
            const endOfYear = new Date(this.currentYear, 11, 31);
            return from >= startOfYear && to <= endOfYear && item.status !== "Rejected";
        });
        const totalNoofDays = filteredData.reduce((sum, item) => sum + parseFloat(item.NoofDays || 0), 0);

        const oLeaveModel = this.getView().getModel("secondLeaveData");
        const leaveData = oLeaveModel?.getProperty("/chartData") || [];
        const quotaLeave = leaveData.find(l => l.LeaveStatus === "All Quota") || { Count: 0 };

        // Monthly quota check for "All In One Leave"
        if (oData.typeOfLeave === "All In One Leave") {
            const joiningMonth = parseInt(this.JoiningDate[1]);
            const joiningYear = parseInt(this.JoiningDate[2]);
            const currentMonth = currentDate.getMonth() + 1;
            const monthsSinceJoining = joiningYear === currentDate.getFullYear()
                ? Math.max(0, currentMonth - joiningMonth + 1)
                : joiningYear < currentDate.getFullYear() ? currentMonth : 0;
            const monthlyQuota = monthsSinceJoining * 1.33;
            const usedLeaves = leaveData.filter(l => l.LeaveType === "All In One Leave" && ["Submitted", "Approved"].includes(l.LeaveStatus))
                .reduce((sum, l) => sum + parseFloat(l.Count || 0), 0);
            const projectedLeaves = usedLeaves + parseFloat(oData.NoofDays) - parseFloat(this.UpdateNoofDays || 0);
            if (projectedLeaves > monthlyQuota) return MessageBox.error(this.i18nModel.getText("monthlyQuotatillNow"));
        }

        // Final quota check
        const valid = parseFloat(this.UpdateNoofDays) === parseFloat(oData.NoofDays) || totalNoofDays <= quotaLeave.Count;

        // Prepare backend payload
        if (["LOP", "Compoff"].includes(oData.typeOfLeave) || valid) {
            const payload = {
                data: {
                    ID: oData.ID,
                    employeeID: oData.employeeID,
                    employeeName: oData.employeeName,
                    fromDate: new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().split("T")[0],
                    toDate: new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().split("T")[0],
                    NoofDays: parseFloat(oData.NoofDays),
                    typeOfLeave: oData.typeOfLeave,
                    comments: oData.comments || "",
                    halfDay: oData.halfDay === "true" || oData.halfDay === true,
                    managerRemark: oData.managerRemark || "",
                    email: oData.email
                },
                filters: { ID: oData.ID }
            };

            this.getBusyDialog();
            this.ajaxUpdateWithJQuery("CompOff", payload)
                .then(res => {
                    this.closeBusyDialog();
                    this._handleResponse(res, "leaveUpdatedSuccess");
                })
                .catch(err => {
                    this.closeBusyDialog();
                    MessageToast.show(err.message || err.responseText);
                });
        } else {
            MessageBox.error(this.i18nModel.getText("quotaExceeded"));
        }

    } catch (error) {
        this.closeBusyDialog();
        MessageToast.show(error.message || error.responseText);
    }
},

      AL_onPressDelete: async function () {
        try {
          var oTable = this.byId("AL_id_compOffTableStandard").getSelectedItem();
          if (!oTable) {
            MessageToast.show(this.i18nModel.getText("selectLeaveToDelete"));
            return;
          }

          var oModelData = oTable.getBindingContext("LeaveModel").getObject();
          var requestData = { filters: { ID: oModelData.ID } };

          // Show confirmation dialog before delete
          this.showConfirmationDialog(
            this.i18nModel.getText("confirmDeleteTitle"),
            this.i18nModel.getText("confirmDeleteMessage"),
            async function () {
              this.getBusyDialog(); // Show busy dialog

              try {
                const response = await this.ajaxDeleteWithJQuery("InboxDetails", requestData);

                this.closeBusyDialog();
                
                if (response.success === true) {
                  MessageToast.show(this.i18nModel.getText("leaveDeletedSuccess"));
                  this.byId("AL_id_compOffTableStandard").removeSelections(true);
                  this.byId("AL_id_compoffUpdatebtn").setVisible(false);
                  this.byId("AL_id_compoffDeletebtn").setVisible(false);
                  // this.BarDisplayFunction("All In One Leave", this.currentYear, this.userId);
await this._fetchCompOffData();


                } else {
                  MessageToast.show(response.message || response.responseText);
                }
              } catch (error) {
                this.closeBusyDialog();
                MessageToast.show(error.message || error.responseText);
              }
            }.bind(this) // fnOnConfirm
          );
        } catch (error) {
          this.closeBusyDialog();
          MessageToast.show(error.message || error.responseText);
        }
      },
  openLeaveDialog: function (oView) {
  // Check if the dialog fragment has already been created or is in the process of being created
  if (this.pLeaveDialog) {
    // If the promise already exists, just open the dialog once it's created
    this.pLeaveDialog.then((oLeaveDialog) => oLeaveDialog.open());
    return;
  }

  // Load the dialog fragment and store the promise
  this.pLeaveDialog = sap.ui.core.Fragment.load({
    name: "sap.kt.com.minihrsolution.fragment.applyCompOff",
    controller: this,
  }).then(
    function (oLeaveDialog) {
      this.oLeaveDialog = oLeaveDialog;
      oView.addDependent(this.oLeaveDialog);
      return this.oLeaveDialog;
    }.bind(this)
  );

  // Open the dialog once the promise resolves
  this.pLeaveDialog.then((oLeaveDialog) => oLeaveDialog.open());
},

        _resetDialogFields: function () {
          this._FragmentDatePickersReadOnly(["AL_id_CF_FromDate", "AL_id_CF_ToDate"]);
          sap.ui.getCore().byId("AL_id_CF_FromDate").setValueState("None");
          sap.ui.getCore().byId("AL_id_CF_ToDate").setValueState("None");
          sap.ui.getCore().byId("AL_id_CompoffComments").setValueState("None");
        },

        AL_onPressClose: function () {
          this.oLeaveDialog.close();
          this.byId("AL_id_compOffTableStandard").removeSelections(true); // Clear table selection
          this.byId("AL_id_compoffUpdatebtn").setVisible(false);
          this.byId("AL_id_compoffDeletebtn").setVisible(false);
          if (this._originalLeaveData) {
            var aLeaveData = this.getView().getModel("LeaveModel").getProperty("/");
            var iIndex = aLeaveData.findIndex((item) => item.ID === this._originalLeaveData.ID);
            if (iIndex > -1) {
              aLeaveData[iIndex] = JSON.parse(JSON.stringify(this._originalLeaveData));
              this.getView().getModel("LeaveModel").setProperty("/", aLeaveData);
            }
            this._originalLeaveData = null;
          }
        },

        // Format date string to Date object
        onFormatDate: function (dateString) {
          var parts = dateString.split("/");
          return new Date(parts[2], parts[1] - 1, parts[0]);
        },

      // BarDisplayFunction: async function (leaveType, selectedYear, userId) {
      //   let jsonData = {
      //     data: { EmployeeID: userId, selectYear: selectedYear, LeaveType: leaveType },
      //   };
      //   try {
      //     // Fetch data from backend
      //     let oData = await this.ajaxCreateWithJQuery("LeavesFirstBarChart", jsonData);
      //     this.closeBusyDialog(); //  Close BusyDialog
      //     // Filter data for first chart
      //     let firstChartData = oData.results.filter((item) => ["Submitted", "Approved", "Quota"].includes(item.LeaveStatus));
      //     // Filter data for second chart
      //     let secondChartData = oData.results.filter((item) => ["Submitted", "Approved", "All Quota"].includes(item.LeaveStatus));
      //     // Set models for charts
      //     let oFirstChartModel = new JSONModel({ chartData: firstChartData });
      //     this.getView().setModel(oFirstChartModel, "firstLeaveData");

      //     let oSecondChartModel = new JSONModel({ chartData: secondChartData });
      //     this.getView().setModel(oSecondChartModel, "secondLeaveData");

      //     // Configure charts
      //     this._configureFirstChart("AL_id_VizFrame6", oFirstChartModel, this.i18nModel.getText("currentLeaveQuota"), leaveType);
      //     this._configureSecondChart("AL_id_VizFrameAll", oSecondChartModel, this.i18nModel.getText("yearlyLeaveQuota"), leaveType);
      //   } catch (error) {
      //     this.closeBusyDialog(); //  Close BusyDialog
      //     MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
      //   }
      // },

      // _configureFirstChart: function (chartId, oModel, titleText, leaveType) {
      //   let oVizFrame = this.getView().byId(chartId);
      //   if (!oVizFrame) return;

      //   oVizFrame.setModel(oModel);

      //   // Base rules
      //   let rules = [
      //     {
      //       dataContext: { LeaveType: "Submitted" },
      //       properties: { color: "#FFB347" },
      //       displayName: "Submitted",
      //     },
      //     {
      //       dataContext: { LeaveType: "Approved" },
      //       properties: { color: "#4CAF50" },
      //       displayName: "Approved",
      //     },
      //   ];

      //   // Add "Quota" only if leaveType is not LOP
      //   if (leaveType === "All In One Leave") {
      //     rules.push({
      //       dataContext: { LeaveType: "Quota" },
      //       properties: { color: "#4c79e0" },
      //       displayName: "Quota",
      //     });
      //   }

      //   oVizFrame.setVizProperties({
      //     legend: {
      //       title: { visible: true, text: "All Measures" },
      //     },
      //     title: {
      //       visible: true,
      //       text: titleText,
      //     },
      //     plotArea: {
      //       dataPointStyle: {
      //         rules: rules,
      //       },
      //     },
      //   });

      //   let popoverId = chartId === "AL_id_VizFrame6" ? "AL_id_PieChart" : null;
      //   let oPopOver = popoverId ? this.getView().byId(popoverId) : null;
      //   if (oPopOver) {
      //     oPopOver.connect(oVizFrame.getVizUid());
      //   }
      // },

      // _configureSecondChart: function (chartId, oModel, titleText, leaveType) {
      //   let oVizFrame = this.getView().byId(chartId);
      //   if (!oVizFrame) return;

      //   oVizFrame.setModel(oModel);

      //   let rules = [
      //     {
      //       dataContext: { LeaveType: "Submitted" },
      //       properties: { color: "#FFB347" },
      //       displayName: "Submitted",
      //     },
      //     {
      //       dataContext: { LeaveType: "Approved" },
      //       properties: { color: "#4CAF50" },
      //       displayName: "Approved",
      //     },
      //   ];

      //   if (leaveType === "All In One Leave") {
      //     rules.push({
      //       dataContext: { LeaveType: "All Quota" },
      //       properties: { color: "#4c79e0" },
      //       displayName: "Quota",
      //     });
      //   }

      //   oVizFrame.setVizProperties({
      //     legend: {
      //       title: { visible: true, text: "All Measures" },
      //     },
      //     title: {
      //       visible: true,
      //       text: titleText,
      //     },
      //     plotArea: {
      //       dataPointStyle: {
      //         rules: rules,
      //       },
      //     },
      //   });

      //   let popoverId = chartId === "AL_id_VizFrameAll" ? "AL_id_PieChartAll" : null;
      //   let oPopOver = popoverId ? this.getView().byId(popoverId) : null;
      //   if (oPopOver) {
      //     oPopOver.connect(oVizFrame.getVizUid());
      //   }
      // },

      // // Function to display monthly bar chart
      // // MonthBarDisplayFunction: async function (leaveType, selectedYear, userId) {
      // //   let jsonData = { data: { EmployeeID: userId, selectYear: selectedYear, LeaveType: leaveType } };
      // //   try {
      // //     let oData = await this.ajaxCreateWithJQuery("MonthyBarChart", jsonData);
      // //     this.closeBusyDialog(); //  Close BusyDialog
      // //     let oLeaveModel = new JSONModel({ chartData: oData.results });
      // //     this.getView().setModel(oLeaveModel, "MonthleaveData");
      // //     var oVizFrame = this.getView().byId("AL_id_VizFrame");
      // //     oVizFrame.setVizProperties({
      // //       legend: { title: { visible: true } },
      // //       title: { visible: true, text: this.i18nModel.getText("monthlyApprovedLeaveQuota") },
      // //     });
      // //     oVizFrame.setModel(oLeaveModel);
      // //     var oPopOver = this.getView().byId("AL_id_Popover");
      // //     oPopOver.connect(oVizFrame.getVizUid());
      // //   } catch (error) {
      // //     this.closeBusyDialog(); //  Close BusyDialog
      // //     MessageToast.show(error.message || error.responseText);
      // //   }
      // // },

      // // Function to display yearly bar chart
      // // YearlyBarDisplayFunction: async function (userId) {
      // //   let jsonData = { data: { EmployeeID: userId } };
      // //   try {
      // //     let oData = await this.ajaxCreateWithJQuery("YearlyBarChart", jsonData);
      // //     this.closeBusyDialog(); //  Close BusyDialog
      // //     let rawData = oData.results;
      // //     let result = [];
      // //     // Process raw data into chart format
      // //     rawData.forEach((item) => {
      // //       let yearEntry = result.find((entry) => entry.Year === item.Year);
      // //       if (!yearEntry) {
      // //         yearEntry = { Year: item.Year };
      // //         result.push(yearEntry);
      // //       }
      // //       yearEntry[item.LeaveType.replace(/\s+/g, "")] = item.Count;
      // //     });
      // //     let oLeaveModel = new JSONModel({ chartData: result });
      // //     this.getView().setModel(oLeaveModel, "YearleaveData");
      // //     var oVizFrame = this.getView().byId("AL_id_VizFrameYear");
      // //     oVizFrame.setVizProperties({
      // //       legend: { title: { visible: true } },
      // //       title: { visible: true, text: this.i18nModel.getText("yearlyApprovedLeaveQuota") },
      // //     });
      // //     oVizFrame.setModel(oLeaveModel);
      // //     var oPopOver = this.getView().byId("AL_id_PopOver");
      // //     oPopOver.connect(oVizFrame.getVizUid());
      // //   } catch (error) {
      // //     this.closeBusyDialog(); //  Close BusyDialog
      // //     MessageToast.show(error.message || error.responseText);
      // //   }
      // // },

      // // Chart type change handlers
      // AL_onPressPie: function () {
      //   this.getView().getModel("MonthlyBar").setProperty("/type", "pie");
      // },

      // AL_onPressColumn: function () {
      //   this.getView().getModel("MonthlyBar").setProperty("/type", "column");
      // },

      // AL_onPressBar: function () {
      //   this.getView().getModel("MonthlyBar").setProperty("/type", "line");
      // },

      // // Leave type change handler
      // AL_onChangeLeaveType: function (oEvent) {
      //   this.getBusyDialog(); // Show busy dialog
      //   var year = this.byId("AL_id_LeaveYear").getSelectedKey();
      //   var type = oEvent.getSource().getSelectedItem().getText();
      //   this.BarDisplayFunction(type, year, this.userId);
      //   this.MonthBarDisplayFunction(type, year, this.userId);
      // },

      // Year change handler
      AL_onChangeYears: function (oEvent) {
        this.getBusyDialog(); // Show busy dialog
        var type = this.byId("AL_id_TypeOfLeave").getSelectedItem().getText();
        var year = oEvent.getSource().getSelectedKey();
        this.BarDisplayFunction(type, year, this.userId);
        this.MonthBarDisplayFunction(type, year, this.userId);
      },

      // Show bar chart view
      // AL_onPressBarChart: function () {
      //   this.getBusyDialog(); // Show busy dialog
      //   this.byId("AL_id_LeaveBarChart").setVisible(true);
      //   this.byId("AL_id_compOffTableStandard").setVisible(false);
      //   this.byId("AL_id_compofffilterbar").setVisible(false);
      //   this.getView().byId("AL_id_TypeOfLeave").setSelectedKey("All In One Leave");
      //   this.getView().byId("AL_id_LeaveYear").setSelectedKey(this.currentYear);
      //   if (this.Type === "Trainee") {
      //     this.byId("AL_id_MonthlyChart").setVisible(false);
      //     this.byId("AL_id_YearlyChart").setVisible(false);
      //     this.byId("AL_id_LeaveYear").setVisible(false);
      //     this.byId("AL_id_YearLabel").setVisible(false);
      //     this.BarDisplayFunction("All In One Leave", this.currentYear, this.userId)
      //       .then(() => sap.ui.core.BusyIndicator.hide())
      //       .catch((error) => {
      //         this.closeBusyDialog(); //  Close BusyDialog
      //         MessageToast.show(error.message || error.responseText);
      //       });
      //   } else {
      //     this.byId("AL_id_MonthlyChart").setVisible(true);
      //     this.byId("AL_id_YearlyChart").setVisible(true);
      //     this.byId("AL_id_LeaveYear").setVisible(true);
      //     this.byId("AL_id_YearLabel").setVisible(true);
      //     this.BarDisplayFunction("All In One Leave", this.currentYear, this.userId),
      //       this.MonthBarDisplayFunction("All In One Leave", this.currentYear, this.userId),
      //       this.YearlyBarDisplayFunction(this.userId)
      //         .then(() => sap.ui.core.BusyIndicator.hide())
      //         .catch((error) => {
      //           this.closeBusyDialog(); //  Close BusyDialog
      //           MessageToast.show(error.message || error.responseText);
      //         });
      //   }
      // },

      // Show table view
      // AL_onPressGoSmartTable: function () {
      //   this.byId("AL_id_LeaveBarChart").setVisible(false);
      //   this.byId("AL_id_compOffTableStandard").setVisible(true);
      //   this.byId("AL_id_compofffilterbar").setVisible(true);
      // },

      // Chart display mode handlers
      // AL_onPressBarChartMonth: function () {
      //   this.getView().getModel("MonthlyBar").setProperty("/Name", "column");
      // },

      // AL_onPresslineChartMonth: function () {
      //   this.getView().getModel("MonthlyBar").setProperty("/Name", "line");
      // },

      // AL_onPressAreaChart: function () {
      //   this.getView().getModel("MonthlyBar").setProperty("/AllStatus", "area");
      // },

      // AL_onPressColumnAllStatus: function () {
      //   this.getView().getModel("MonthlyBar").setProperty("/AllStatus", "column");
      // },




AL_onShowEmployeeComments: function (oEvent) {
    var oContext = oEvent.getSource().getBindingContext("LeaveModel");
    var oData = oContext.getObject();

    // ✅ Normalize EmpComment (can be array or string)
    var aComments = [];
    if (Array.isArray(oData.EmpComment)) {
        aComments = oData.EmpComment;
    } else if (typeof oData.EmpComment === "string" && oData.EmpComment.trim() !== "") {
        aComments = [{
            Comment: oData.EmpComment,
            CommentDateTime: oData.SubmittedDate || new Date().toISOString(),
            EmpName: oData.EmpName || "Anonymous"
        }];
    }

    // ✅ Build Timeline items
    var aTimelineItems = aComments.slice().reverse().map(function (oComment) {
        var sComment = oComment.Comment || oComment || "No comment provided";
        return new TimelineItem({
            dateTime: oComment.CommentDateTime
                ? new Date(oComment.CommentDateTime).toLocaleString()
                : (oData.SubmittedDate ? new Date(oData.SubmittedDate).toLocaleString() : ""),
            title: oComment.EmpName || oData.EmpName || "Anonymous",  // Always use EmpName
            text: sComment,
            userNameClickable: false,
            icon: "sap-icon://comment"
        });
    });

    // ✅ Timeline control
    var oTimeline = new Timeline({
        showHeader: false,
        enableBusyIndicator: false,
        width: "100%",
        sortOldestFirst: false,
        enableDoubleSided: false,
        content: aTimelineItems,
        showHeaderBar: false
    });

    // ✅ Dialog
    var oDialog = new sap.m.Dialog({
        title: "Leave Comments",
        contentWidth: "25rem",
        contentHeight: "15rem",
        draggable: true,
        resizable: true,
        content: [oTimeline],
        endButton: new sap.m.Button({
            text: "Close",
            type: "Reject",
            press: function () {
                oDialog.close();
                oDialog.destroy();
            }
        })
    });

    oDialog.open();
},




//       // old code AL_onShowEmployeeComments
// AL_onShowEmployeeComments: function (oEvent) {
//     var oContext = oEvent.getSource().getBindingContext("LeaveModel");
//     var oData = oContext.getObject();

//     // Use the correct property name
//     var aComments = oData.Comments || [];

//     var aTimelineItems = aComments.reverse().map(function (oComment) {
//         return new TimelineItem({
//             dateTime: new Date(oComment.CommentDateTime).toLocaleString(),
//             title: oComment.CommentedBy || "Anonymous",
//             text: oComment.Comment || "No comment provided",
//             userNameClickable: false,
//             icon: "sap-icon://comment",
//         });
//     });

//     var oTimeline = new Timeline({
//         showHeader: false,
//         enableBusyIndicator: false,
//         width: "100%",
//         sortOldestFirst: false,
//         enableDoubleSided: false,
//         content: aTimelineItems,
//         showHeaderBar: false,
//     });

//     var oDialog = new sap.m.Dialog({
//         title: "Leave Comments",
//         contentWidth: "25rem",
//         contentHeight: "15rem",
//         draggable: true,
//         resizable: true,
//         content: [oTimeline],
//         endButton: new sap.m.Button({
//             text: "Close",
//             type: "Reject",
//             press: function () {
//                 oDialog.close();
//                 oDialog.destroy();
//             },
//         }),
//     });

//     oDialog.open();
// },


      // Mark calendar dates with leave and holiday information
      onMarkCalendarDatesAndLeaves: function () {
        var that = this;
        this.oDatePicker.removeAllSpecialDates();

        // Get leave and holiday data
        var leaveRecords = that.getView().getModel("LeaveModel").getData();
        var holidays = that.getView().getModel("HolidayModel").getData();

        // Create a map of holiday date string -> holiday name
        var holidayMap = new Map(
          holidays.map(function (holiday) {
            return [new Date(holiday.Date).toDateString(), holiday.Name];
          })
        );

        var appliedLeaves = [];
        var yearStart = new Date(new Date().getFullYear(), 0, 1);
        var yearEnd = new Date(new Date().getFullYear(), 11, 31);

        // Process leave records
        leaveRecords.forEach(function (record) {
          if (record["status"] !== "Rejected") {
            var fromDate = that.onFormatDate(that.Formatter.formatDate(record.fromDate));
            var toDate = that.onFormatDate(that.Formatter.formatDate(record.toDate));
            if (fromDate && toDate) {
              for (var d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
                appliedLeaves.push({
                  date: new Date(d),
                  employeeId: record["employeeID"],
                });
              }
            }
          }
        });

        var appliedLeavesSet = new Set(appliedLeaves.map((leave) => leave.date.toDateString()));

        // Mark each day of the year
        for (var d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
          var day = d.getDay();
          var isWeekend = day === 0 || day === 6;
          var isAppliedLeave = appliedLeavesSet.has(d.toDateString());
          var holidayName = holidayMap.get(d.toDateString());

          var dateRange = new sap.ui.unified.DateTypeRange({
            startDate: new Date(d),
            endDate: new Date(d),
          });

          if (holidayName) {
            dateRange.setType("Type04");
            dateRange.setTooltip("Holiday : " + holidayName);
          } else if (isWeekend) {
            dateRange.setType("Type09");
            dateRange.setTooltip("Weekend");
          } else if (isAppliedLeave) {
            dateRange.setType("Type05");
            dateRange.setTooltip("Applied Leave");
          } else {
            dateRange.setType("Type06");
            dateRange.setTooltip("Working Day");
          }
          this.oDatePicker.addSpecialDate(dateRange);
        }
        that.appliedLeavesSet = appliedLeavesSet;
      },

      // Initialize calendar legend
      onInitializeLegend: function (oEvent) {
        try {
          sap.ui.core.BusyIndicator.show(0);
          this.oDatePicker = oEvent.getSource();
          if (this.oDatePicker) {
            var oLegend = new sap.ui.unified.CalendarLegend({
              items: [new sap.ui.unified.CalendarLegendItem({ type: "Type04", text: "Holiday" }), new sap.ui.unified.CalendarLegendItem({ type: "Type09", text: "Weekend" }), new sap.ui.unified.CalendarLegendItem({ type: "Type06", text: "Working Day" }), new sap.ui.unified.CalendarLegendItem({ type: "Type05", text: "Applied Leaves" })],
            });
            this.oDatePicker.setLegend(oLegend);
            this.onMarkCalendarDatesAndLeaves();
          }
        } catch (error) {
          MessageToast.show(error.message || error.responseText);
        } finally {
          sap.ui.core.BusyIndicator.hide();
        }
      },

      // Update leave button handler
AL_onPressUpdate: function () {
    var oView = this.getView();
    var oTable = this.byId("AL_id_compOffTableStandard").getSelectedItem();
    if (!oTable) return MessageToast.show("Please select a leave row to update.");

    var oModelData = JSON.parse(JSON.stringify(oTable.getBindingContext("LeaveModel").getObject()));
    this._originalLeaveData = JSON.parse(JSON.stringify(oModelData));
    this.UpdateNoofDays = oModelData.NoofDays;
    this.previousLeaveDates = [];

    // Collect previous leave dates if needed
    let prevFrom = this.onFormatDate(this.Formatter.formatDate(oModelData.StartDate));
    let prevTo = this.onFormatDate(this.Formatter.formatDate(oModelData.EndDate));
    for (let d = new Date(prevFrom); d <= new Date(prevTo); d.setDate(d.getDate() + 1)) {
        this.previousLeaveDates.push(d.toDateString());
    }

    // Normalize EmpComment for dialog
    let sComment = "";
    if (oModelData.EmpComment) {
        if (Array.isArray(oModelData.EmpComment)) {
            sComment = oModelData.EmpComment[0]?.Comment || "";
        } else if (typeof oModelData.EmpComment === "string") {
            sComment = oModelData.EmpComment;
        }
    }

    // Prepare leave data for dialog model
    var leaveJson = {
        ID: oModelData.ID,
        employeeID: oModelData.EmpID,
        employeeName: oModelData.EmpName,
        email: oModelData.EmpEmailID,
        fromDate: this.Formatter.formatDate(oModelData.StartDate),
        toDate: this.Formatter.formatDate(oModelData.EndDate),
        NoofDays: oModelData.NoofDays,
        typeOfLeave: oModelData.SubType,
        Comments: sComment,
        Submit: false,
        Save: true,
        halfDay: oModelData.halfDay === "false" ? false : true,
        managerRemark: oModelData.ManagerRemark,
        maxDate: null,
        minDate: null,
        isUpdate: true
    };

    // Set min/max dates for current month
    const currentDate = new Date();
    const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    leaveJson.minDate = firstOfMonth;
    leaveJson.maxDate = lastOfMonth;

    // Apply limits to the datepickers directly
    const oFromDate = sap.ui.getCore().byId("AL_id_CF_FromDate");
    const oToDate = sap.ui.getCore().byId("AL_id_CF_ToDate");
    if (oFromDate && oToDate) {
        oFromDate.setMinDate(firstOfMonth);
        oFromDate.setMaxDate(lastOfMonth);
        oToDate.setMinDate(firstOfMonth);
        oToDate.setMaxDate(lastOfMonth);
    }

    // Set data into LeaveTempModel and open dialog
    var oLeaveTempModel = new JSONModel(leaveJson);
    oView.setModel(oLeaveTempModel, "LeaveTempModel");
    this.openLeaveDialog(oView);
},


      // Calculate leave days when dates change
      onLiveChange: function () {
        var oLeaveModel = this.getView().getModel("LeaveTempModel");
        var sFromDate = oLeaveModel.getProperty("/fromDate");
        var sToDate = oLeaveModel.getProperty("/toDate");
        var isHalfDay = oLeaveModel.getProperty("/halfDay");

        var LeaveModel = this.getView().getModel("LeaveModel").getData();
        var filterData = LeaveModel.filter((item) => {
          return item.ID === oLeaveModel.getData().ID;
        });

        // Calculate business days excluding weekends and holidays
        var holidays = this.getView().getModel("HolidayModel").getData();
        var sNoofDays = this.calculateBusinessDays(sFromDate, sToDate, holidays);
        if (isHalfDay && sNoofDays > 0) {
          sNoofDays -= 0.5;
        }

        oLeaveModel.setProperty("/NoofDays", sNoofDays.toString());
        if (filterData.length !== 0) {
          filterData[0].NoofDays = oLeaveModel.getProperty("/NoofDays");
        }
      },

      // Calculate business days between two dates
      calculateBusinessDays: function (startDate, endDate, holidays) {
        var start = this.onFormatDate(startDate);
        var end = this.onFormatDate(endDate);
        // Create set of holiday dates
        var holidaySet = new Set(
          holidays.map(function (holiday) {
            var holidayDate = this.Formatter.formatDate(holiday.Date);
            var dateObject = this.onFormatDate(holidayDate);
            return dateObject.toDateString();
          }, this)
        );

        var diff = end - start;
        var totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
        var businessDays = 0;

        // Count business days (excluding weekends and holidays)
        for (var i = 0; i < totalDays; i++) {
          var currentDate = new Date(start);
          currentDate.setDate(start.getDate() + i);
          var dayOfWeek = currentDate.getDay();
          var dateString = currentDate.toDateString();

          if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateString)) {
            businessDays++;
          }
        }
        return businessDays;
      },

      onHalfDaySelect: function (oEvent) {
        var bSelected = oEvent.getParameter("selected"); // Always reliable
        var oLeaveModel = this.getView().getModel("LeaveTempModel");
        oLeaveModel.setProperty("/halfDay", bSelected); // Set updated value explicitly
        this.onLiveChange(); // Recalculate
      },

      // Check if leave is already applied for given dates
      isLeaveAlreadyApplied: function (fromDate, toDate, previousDates = []) {
        let from = this.onFormatDate(fromDate);
        let to = this.onFormatDate(toDate);

        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          let dateStr = d.toDateString();
          if (this.appliedLeavesSet.has(dateStr) && !previousDates.includes(dateStr)) {
            return true; // Date already applied by someone else and not in original
          }
        }
        return false;
      },

      // Validation when from date changes
      onValidation: function () {
        var oLeaveModel = this.getView().getModel("LeaveTempModel");
        var sFromDate = oLeaveModel.getProperty("/fromDate");
        sFromDate = this.onFormatDate(sFromDate);
        var oFromDate = new Date(sFromDate);
        if (!isNaN(oFromDate.getTime())) {
          oLeaveModel.setProperty("/MinToDate", oFromDate);
        }
      },

      // Validate from date
      AL_ValidateFromDate: function (oEvent) {
        const oDate = oEvent.getSource().getDateValue();
        if (oDate) {
          oEvent.getSource().setValueState("None"); // Clear error state
        }
        const oFromDatePicker = sap.ui.getCore().byId("AL_id_CF_FromDate");
        const oToDatePicker = sap.ui.getCore().byId("AL_id_CF_ToDate");
        const oFromDate = oFromDatePicker.getDateValue(); // Date object
        const oToDate = oToDatePicker.getDateValue(); // Date object
        if (oFromDate && oToDate && oFromDate > oToDate) {
          oToDatePicker.setDateValue(null); // Clear the ToDate if FromDate is greater
          oToDatePicker.setValue("");
          oToDatePicker.setValueState("Error");
          oToDatePicker.setValueStateText("From Date cannot be greater than To Date");
          this.onValidation();
          return false;
        }
        this.onValidation();
        this.onLiveChange();
        return !!this.getView().getModel("LeaveTempModel").getProperty("/fromDate");
      },

      // Validate to date
      AL_ValidateToDate: function (oEvent) {
        const oToDatePicker = oEvent.getSource(); // DatePicker control
        const oToDate = oToDatePicker.getDateValue(); // Date object

        if (oToDate) {
          oToDatePicker.setValueState("None"); // Clear error state
        }

        const oFromDate = sap.ui.getCore().byId("AL_id_CF_FromDate").getDateValue();
        if (!oFromDate) {
          oToDatePicker.setDateValue(null); // Clear the ToDate if FromDate is not selected
          oToDatePicker.setValue(""); // Also clear the text input
          oToDatePicker.setValueState("Error");
          oToDatePicker.setValueStateText("Please select From Date");
          return false;
        }

        this.onLiveChange();

        return !!this.getView().getModel("LeaveTempModel").getProperty("/toDate");
      },

      // Validate common fields
      AL_ValidateCommonFields: function (oEvent) {
        var oInput = oEvent.getSource();
        utils._LCvalidateMandatoryField(oEvent);
        if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
      },

      // Handle response from backend
      _handleResponse: async function (response, successMessageKey) {
        if (response.success === true) {
          MessageToast.show(this.i18nModel.getText(successMessageKey));
          this.oLeaveDialog.close();
          this.byId("AL_id_compOffTableStandard").removeSelections(true); // Clear table selection
          this.byId("AL_id_compoffUpdatebtn").setVisible(false);
          this.byId("AL_id_compoffDeletebtn").setVisible(false);
          // Refresh leave data
          this.BarDisplayFunction("All In One Leave", this.currentYear, this.userId);
          this._fetchCommonData("Leaves", "LeaveModel", { employeeID: this.userId });
        } else {
          MessageToast.show(error.message || error.responseText);
        }
      },

      // Selection change handler for leave table
onSelectionChange: function (oEvent) {
    var oSelectedItem = oEvent.getParameter("listItem");

    var oUpdateButton = this.byId("AL_id_compoffUpdatebtn");
    var oDeleteButton = this.byId("AL_id_compoffDeletebtn");

    if (oSelectedItem) {
        var oContext = oSelectedItem.getBindingContext("LeaveModel");
        var sStatus = oContext.getProperty("Status"); // ⚠️ Check exact case: "Status" vs "status"

        var bVisible = sStatus === "Submitted";

        oUpdateButton.setVisible(bVisible);
        oDeleteButton.setVisible(bVisible);
    } else {
        // If no row is selected → always hide them
        oUpdateButton.setVisible(false);
        oDeleteButton.setVisible(false);
    }
},



      // AL_onSearch: async function () {
      //   this.getBusyDialog(); // Show busy dialog
      //   var aFilterItems = this.byId("AL_id_compofffilterbar").getFilterGroupItems();
      //   var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
      //   var params = {};
      //   aFilterItems.forEach(function (oItem) {
      //     var oControl = oItem.getControl();
      //     var sValue = oItem.getName();
      //     if (oControl && oControl.getValue()) {
      //       if (sValue === "dateRange") {
      //         var oFromDate = oControl.getDateValue();
      //         var oToDate = oControl.getSecondDateValue();
      //         params["fromDate"] = oDateFormat.format(oFromDate);
      //         params["toDate"] = oDateFormat.format(oToDate);
      //       } else {
      //         params[sValue] = oControl.getValue();
      //       }
      //     }
      //   });
      //   try {
      //   await this._fetchCompOffData();


      //   } catch (error) {
      //     sap.m.MessageToast.show(error.message || error.responseText);
      //   } finally {
      //     this.closeBusyDialog(); // Close after call finishes
      //   }
      // },
AL_onSearch: async function () {
    this.getBusyDialog(); // Show busy dialog

    const oFilterBar = this.byId("AL_id_compofffilterbar");
    const aFilterItems = oFilterBar.getFilterGroupItems();
    const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });

    let params = {};

    aFilterItems.forEach(oItem => {
        const oControl = oItem.getControl();
        const sName = oItem.getName();

        if (sName === "dateRange") {
            const oFromDate = oControl.getDateValue();
            const oToDate = oControl.getSecondDateValue();
            if (oFromDate && oToDate) {
                params.fromDate = oDateFormat.format(oFromDate);
                params.toDate = oDateFormat.format(oToDate);
            }
        }

        if (sName === "typeOfLeave") {
            const sKey = oControl.getSelectedKey();
            if (sKey) {
                params.empId = sKey;
            }
        }
    });

    try {
        // Pass params to your backend fetch
        await this._fetchCompOffData("InboxDetails", "LeaveModel", params);

    } catch (error) {
        sap.m.MessageToast.show(error.message || error.responseText);
    } finally {
        this.closeBusyDialog(); // Close after call finishes
    }
},


      // Clear filters in leave filter bar
      AL_onClear: function () {
        this.byId("AL_id_compoff_DateRangeSelection").setDateValue(null);
        this.byId("AL_id_compoff_DateRangeSelection").setSecondDateValue(null);
        var oComboBox = this.getView().byId("AL_id_compoff_Leavetype_fil")
        oComboBox.setSelectedKey("");
      },

      getGroupHeader: function (oGroup) {
        return this.getStyledGroupHeader(oGroup);
      },
      AL_ValidateLeavetype: function (oEvent) {
        utils._LCstrictValidationComboBox(oEvent.getSource(), "ID");
      },
      AL_DownalodTableData: function () {
        var table = this.byId("AL_id_compOffTableStandard");
        const oModelData = table.getModel("LeaveModel").getData();
        const aFormattedData = oModelData.map((item) => {
          return {
            ...item,
            fromDate: Formatter.formatDate(item.fromDate),
            toDate: Formatter.formatDate(item.toDate),
          };
        });
        const aCols = [
          { label: this.i18nModel.getText("fromDate"), property: "fromDate", type: "string" },
          { label: this.i18nModel.getText("toDate"), property: "toDate", type: "string" },
          { label: this.i18nModel.getText("noOfDays"), property: "NoofDays", type: "string" },
          { label: this.i18nModel.getText("typeOfLeave"), property: "typeOfLeave", type: "string" },
          { label: this.i18nModel.getText("halfDay"), property: "halfDay", type: "string " },
          // { label: this.i18nModel.getText("enterComments"), property: "comments", type: "string" },
        ];
        const oSettings = {
          workbook: {
            columns: aCols,
            context: {
              sheetName: this.i18nModel.getText("enboxDetails"),
            },
          },
          dataSource: aFormattedData,
          fileName: "LeaveDetails.xlsx",
        };
        const oSheet = new Spreadsheet(oSettings);
        oSheet
          .build()
          .then(
            function () {
              MessageToast.show(this.i18nModel.getText("downloadsuccessfully"));
            }.bind(this)
          )
          .finally(function () {
            oSheet.destroy();
          });
      },
    });
  }
);
