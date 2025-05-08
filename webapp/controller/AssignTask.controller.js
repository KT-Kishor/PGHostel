sap.ui.define(
  [
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
  ],
  function (BaseController, utils, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.AssignTask",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteAssignTask").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {
          var LoginFunction = await this.commonLoginFunction("ManageAssignment");
          if (!LoginFunction) return;
          this.getBusyDialog();
          const sTaskID = oEvent.getParameter("arguments").taskID;
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          // Save the taskID to the controller
          this._currentTaskID = sTaskID;
          this._fetchTaskDetails(sTaskID);
          this.readCallForAllLoginDetails();
          this.CommonReadcall({ TaskID: sTaskID });
        },

        _fetchTaskDetails: async function (sTaskID) {
          try {
            this.getBusyDialog();
            const response = await this.ajaxReadWithJQuery("NewTask", {
              TaskID: sTaskID,
            });
            if (response.success) {
              this.closeBusyDialog();
              const oTaskDetails = Array.isArray(response.data)
                ? response.data[0]
                : response.data;
              this.getView().setModel(
                new JSONModel(oTaskDetails),
                "TaskDetailsModel"
              );
            }
          } catch (error) {
            this.closeBusyDialog();
            MessageToast.show(this.i18nModel.getText("smgerrorloading"));
          }
        },
        readCallForAllLoginDetails: async function (filter) {
          this.getBusyDialog();
          // Fetch all login details
          await this.ajaxReadWithJQuery("AllLoginDetails", filter)
            .then((oData) => {
              let loginData = Array.isArray(oData.data) ? oData.data : [oData.data];

              // Set full data model
              this.getView().setModel(
                new JSONModel(loginData), "LoginDetailsModel"
              );

              // If "Initial", filter unique entries by LoginID or another field
              if (filter === "Initial") {
                const uniqueLoginData = [...new Map(loginData.filter((item) => item.LoginID && item.LoginID.trim() !== ""
                ).map((item) => [item.LoginID.trim(), item])).values(),];

                this.getView().setModel(
                  new JSONModel(uniqueLoginData), "AllLoginDetailsModelInitial"
                );
              }
              this.closeBusyDialog();
            })
            .catch((oError) => {
              this.closeBusyDialog();
              MessageToast.show(this.i18nModel.getText("smgerrorlogindetails"));
            });
        },

        AT_validateDate: function (oEvent) {
          utils._LCvalidateDate(oEvent);
        },
        AT_ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        FAT_onchangeEmpId: function (oEvent) {
          utils._LCvalidationComboBox(oEvent);
        },
        AT_ValidateHournFields: function (oEvent) {
          utils._LCvalidateTimeLimit(oEvent);
        },

        AT_onPressback: function () {
          this.getRouter().navTo("RouteManageAssignment");
        },
        //open task fragment
        AT_onAssignEmpTask: function () {
          this.manageTaskDetails(false); // false means create
        },

        AT_onEditTask: function () {
          this.manageTaskDetails(true); // true means edit
        },

        manageTaskDetails: function (bIsEdit) {
          const oView = this.getView();
          // Add 'isEditMode' to track edit state (true = edit mode, false = create mode)
          const oVisibleModel = new JSONModel({
            save: false,
            submit: true,
            isEditMode: bIsEdit, // New property to control field editability
          });
          oView.setModel(oVisibleModel, "visiblePlay");

          let oModel;

          if (bIsEdit) {
            oVisibleModel.setProperty("/save", true);
            oVisibleModel.setProperty("/submit", false);

            const oTable = this.byId("AT_id_TaskTable");
            const oSelectedItem = oTable.getSelectedItem();

            if (!oSelectedItem) {
              return MessageToast.show(this.i18nModel.getText("smgforedittask"));
            }

            const oData = oSelectedItem.getBindingContext("AssignModel").getObject();
            this._originalTaskData = JSON.parse(JSON.stringify(oData));
            oModel = new JSONModel(oData);
          } else {
            this._originalTaskData = null;
            const newTaskData = {
              EmployeeID: "",
              EmployeeName: "",
              HoursWorked: "",
              TaskName: "",
              TaskID: "",
              StartDate: "",
              EndDate: "",
            };
            oModel = new JSONModel(newTaskData);
          }

          oView.setModel(oModel, "EditTaskModel");

          if (!this.oTaskDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.AssignTask",
              controller: this,
            }).then(
              function (oDialog) {
                this.oTaskDialog = oDialog;
                oView.addDependent(oDialog);
                oDialog.open();
              }.bind(this)
            );
          } else {
            this.oTaskDialog.open();
          }
        },

        FAT_onTaskClose: function () {
          if (this.oTaskDialog) {
            this.oTaskDialog.close();
          }
        },
        FAT_onSearch: function () {
          const aFilterItems = this.byId("AT_id_FilterBar").getFilterGroupItems();
          const params = {
            // Always include the current task ID
            TaskID: this._currentTaskID
          };
          aFilterItems.forEach(function (oItem) {
            const oControl = oItem.getControl();
            const sValue = oItem.getName();
            if (oControl && oControl.getValue()) {
              params[sValue] = oControl.getValue();
            }
          });
          // Use the merged params 
          this._fetchCommonData("AssignedTask", "AssignModel", params);
          this.CommonReadcall(params);
        },
        FAT_onPressClear: function () {
          var oFilterBar = this.getView().byId("AT_id_FilterBar");
          oFilterBar.getFilterGroupItems().forEach(function (oItem) {
            var oControl = oItem.getControl();
            if (oControl.setSelectedKey) {
              oControl.setSelectedKey("");
            } else if (oControl.setValue) {
              oControl.setValue("");
            }
          });
        },

        CommonReadcall: async function (params) {
          try {
            this.getBusyDialog();
            const response = await this.ajaxReadWithJQuery(
              "AssignedTask",
              params
            );
            if (response.success) {
              this.closeBusyDialog();
              let taskData = Array.isArray(response.data) ? response.data : [response.data];

              const aEmployees =
                this.getView().getModel("LoginDetailsModel")?.getData() || [];

              // Enrich data with EmployeeName
              taskData = taskData.map((task) => {
                if (task.EmployeeID) {
                  const empIDs = task.EmployeeID.split(",");
                  const names = empIDs.map((id) => {
                    const emp = aEmployees.find((e) => e.EmployeeID === id);
                    return emp ? emp.EmployeeName : "";
                  }).filter((name) => name !== "").join(", ");
                  task.EmployeeName = names;
                }
                return task;
              });

              this.getView().setModel(new JSONModel(taskData), "AssignModel");
            }
          } catch (error) {
            this.getBusyDialog();
            MessageToast.show(this.i18nModel.getText("smgerrorassigntask"));
          }
        },

        //Submit the task details
        FAT_onSubmitTask: async function () {
          const oView = this.getView();
          const aEmployees = oView.getModel("LoginDetailsModel").getData();

          // Validate all fields
          if (
            !utils._LCvalidationComboBox(sap.ui.getCore().byId("FAT_id_EmployeeID"), "ID") ||
            !utils._LCvalidateDate(sap.ui.getCore().byId("FAT_id_StartDate"), "ID") ||
            !utils._LCvalidateDate(sap.ui.getCore().byId("FAT_id_EndDate"), "ID") ||
            !utils._LCvalidateTimeLimit(sap.ui.getCore().byId("FAT_id_HoursWorked"), "ID")
          ) {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }

          const aSelectedIDs = sap.ui.getCore().byId("FAT_id_EmployeeID").getSelectedKeys().filter(key => key.trim() !== "");
          const sTaskID = sap.ui.getCore().byId("FAT_id_TaskID").getValue();

          // Fetch existing assignments for current TaskID
          await this.CommonReadcall({ TaskID: sTaskID });
          const aAssignedTasks = oView.getModel("AssignModel").getData() || [];

          // Extract already assigned EmployeeIDs
          const existingEmployeeIDs = aAssignedTasks.map(task => task.EmployeeID.trim());
          const aFilteredIDs = aSelectedIDs.filter(id => !existingEmployeeIDs.includes(id.trim()));

          if (aFilteredIDs.length === 0) {
            MessageToast.show(this.i18nModel.getText("smgEmptask"));
            this.oTaskDialog.close();
            return;
          }

          const sTaskName = sap.ui.getCore().byId("FAT_id_TaskName").getValue();
          const sHoursWorked = sap.ui.getCore().byId("FAT_id_HoursWorked").getValue();
          const sStartDate = sap.ui.getCore().byId("FAT_id_StartDate").getValue();
          const sEndDate = sap.ui.getCore().byId("FAT_id_EndDate").getValue();

          // Construct full payload array
          const aPayloadData = aFilteredIDs.map(empID => {
            const oEmployee = aEmployees.find(emp => emp.EmployeeID === empID);
            return {
              TaskID: sTaskID,
              TaskName: sTaskName,
              EmployeeID: empID,
              EmployeeName: oEmployee ? oEmployee.EmployeeName : "",
              HoursWorked: sHoursWorked,
              StartDate: sStartDate,
              EndDate: sEndDate
            };
          });

          this.getBusyDialog();
          const response = await this.ajaxCreateWithJQuery("AssignedTask", { data: aPayloadData });
          if (response.success) {
            this.closeBusyDialog();
            await this._fetchCommonData("AssignedTask", "AssignModel", { TaskID: sTaskID });
            await this.CommonReadcall({ TaskID: sTaskID });
            this.oTaskDialog.close();
            MessageToast.show("Employee(s) assigned successfully!");
          } else {
            MessageToast.show(this.i18nModel.getText("smgFailtoassign"));
          }
        },

        //Update the task details
        MA_onPressSave: async function () {
          const oTable = this.byId("AT_id_TaskTable");
          const oSelectedItem = oTable.getSelectedItem();

          if (!oSelectedItem) {
            MessageToast.show(this.i18nModel.getText("smgSelecttask"));
            return;
          }
          const oEditModel = this.getView().getModel("EditTaskModel");
          const oData = { ...oEditModel.getData() }; // Clone data to avoid reference issues
          const oEmpId = oSelectedItem.getBindingContext("AssignModel").getProperty("EmployeeID");

          // Construct both EmployeeID and TaskID filters
          const filters = {
            EmployeeID: oEmpId,
            TaskID: this._currentTaskID
          };

          try {
            this.getBusyDialog();
            const response = await this.ajaxUpdateWithJQuery("/AssignedTask", {
              filters: filters,
              data: oData,
            });

            if (response.success) {
              this.closeBusyDialog();
              MessageToast.show(this.i18nModel.getText("smgUpdatetask"));

              // Refresh data and UI
              this._fetchCommonData("AssignedTask", "AssignModel");
              this.FAT_onSearch();
              // this.CommonReadcall();
              oTable.removeSelections();
              this.oTaskDialog.close();
            } else {
              this.closeBusyDialog();
              MessageToast.show("Update failed: " + (response.message || ""));
            }
          } catch (error) {
            this.closeBusyDialog();
            MessageToast.show("Error updating task: " + error.message);
          }
        },

        AT_onstartDatevalidateDate: function (oEvent) {
          const oStartDate = oEvent.getSource().getDateValue(); // get selected start date
          const oEndDatePicker = sap.ui.getCore().byId("FAT_id_EndDate");

          if (oEndDatePicker) {
            let oEndDate = oEndDatePicker.getDateValue();
            oEndDatePicker.setMinDate(oStartDate);
            if (oEndDate && oEndDate < oStartDate) {
              oEndDatePicker.setDateValue(null);
            }
          }
        },
      }
    );
  }
);
