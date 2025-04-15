sap.ui.define(
  [
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
  ],
  function (BaseController, utils, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.AssignTask",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteAssignTask")
            .attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          const sTaskID = oEvent.getParameter("arguments").taskID;
          // Save the taskID to the controller
          this._currentTaskID = sTaskID;
          this._fetchTaskDetails(sTaskID);
          this.readCallForAllLoginDetails();
          this.CommonReadcall({ TaskID: sTaskID });
        },

        _fetchTaskDetails: async function (sTaskID) {
          try {
            const response = await this.ajaxReadWithJQuery("NewTask", {
              TaskID: sTaskID,
            });
            if (response.success) {
              const oTaskDetails = Array.isArray(response.data)
                ? response.data[0]
                : response.data;
              this.getView().setModel(
                new JSONModel(oTaskDetails),
                "TaskDetailsModel"
              );
            }
          } catch (error) {
            MessageToast.show("Error loading task details");
          }
        },
        readCallForAllLoginDetails: function (filter) {
          sap.ui.core.BusyIndicator.show();

          this.ajaxReadWithJQuery("AllLoginDetails", filter)
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
              sap.ui.core.BusyIndicator.hide();
            })
            .catch((oError) => {
              sap.ui.core.BusyIndicator.hide();
              MessageToast.show("Error while reading All Login Details");
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
              return MessageToast.show("Please select a task to edit");
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
            const response = await this.ajaxReadWithJQuery(
              "AssignedTask",
              params
            );
            if (response.success) {
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
            MessageToast.show("Error loading assigned tasks");
          }
        },

        //Submit the task details
        FAT_onSubmitTask: async function () {
          const oData = this.getView().getModel("EditTaskModel").getData();
          const aEmployees = this.getView().getModel("LoginDetailsModel").getData();

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

          const aSelectedIDs = sap.ui.getCore().byId("FAT_id_EmployeeID").getSelectedKeys()
            .filter((key) => key.trim() !== "");

          const sTaskID = sap.ui.getCore().byId("FAT_id_TaskID").getValue();

          //  Get ONLY existing assignments for the current TaskID
          await this.CommonReadcall({ TaskID: sTaskID }); // This should filter by TaskID at backend or read logic
          const aAssignedTasks = this.getView().getModel("AssignModel").getData() || [];

          //  Only keep EmployeeIDs assigned to the same task
          let existingEmployeeIDs = [];
          aAssignedTasks.forEach(task => {
            if (task.TaskID === sTaskID && task.EmployeeID) {
              const ids = task.EmployeeID.split(",").map(id => id.trim());
              existingEmployeeIDs = existingEmployeeIDs.concat(ids);
            }
          });

          //  Check for duplicate assignment to the same task
          const hasDuplicates = aSelectedIDs.some(id => existingEmployeeIDs.includes(id));
          if (hasDuplicates) {
            MessageToast.show("One or more selected employees are already assigned to this task.");
            this.oTaskDialog.close();
            return;
          }

          // Prepare names
          const aSelectedNames = aSelectedIDs.map((id) => {
            const oEmployee = aEmployees.find((emp) => emp.EmployeeID === id);
            return oEmployee ? oEmployee.EmployeeName : "";
          }).filter(name => name);

          // Set payload
          oData.EmployeeID = aSelectedIDs.join(",");
          oData.EmployeeName = aSelectedNames.join(",");
          oData.HoursWorked = sap.ui.getCore().byId("FAT_id_HoursWorked").getValue();
          oData.TaskName = sap.ui.getCore().byId("FAT_id_TaskName").getValue();
          oData.TaskID = sTaskID;
          oData.StartDate = sap.ui.getCore().byId("FAT_id_StartDate").getValue();
          oData.EndDate = sap.ui.getCore().byId("FAT_id_EndDate").getValue();

          // AJAX create
          const response = await this.ajaxCreateWithJQuery("AssignedTask", { data: oData });

          if (response.success) {
            MessageToast.show("Task Assigned successfully!");
            await this._fetchCommonData("AssignedTask", "AssignModel", { TaskID: sTaskID });
            await this.CommonReadcall({ TaskID: sTaskID });
            this.oTaskDialog.close();
          } else {
            MessageToast.show("Failed to Assign task.");
          }
        },
        //Update the task details
        MA_onPressSave: async function () {
          const oTable = this.byId("AT_id_TaskTable");
          const oSelectedItem = oTable.getSelectedItem();
          const params = {
            // Always include the current task ID
            TaskID: this._currentTaskID
          };
          if (!oSelectedItem) {
            MessageToast.show("Please select a task to update.");
            return;
          }

          const oEditModel = this.getView().getModel("EditTaskModel");
          const oData = { ...oEditModel.getData() }; // Clone data to prevent reference issues
          const oTaskId = oSelectedItem.getBindingContext("AssignModel").getProperty("EmployeeID");

          try {
            const response = await this.ajaxUpdateWithJQuery("/AssignedTask", {
              filters: { EmployeeID: oTaskId },
              data: oData,
            });

            if (response.success) {
              MessageToast.show("Task updated successfully!");

              // 1. Refresh the entire table data
              this._fetchCommonData("AssignedTask", "AssignModel", params);
              this.FAT_onSearch()
              this.CommonReadcall(params);
              // 3. Clear selection and close dialog
              oTable.removeSelections();
              this.oTaskDialog.close();
            } else {
              MessageToast.show("Update failed: " + (response.message || ""));
            }
          } catch (error) {
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
