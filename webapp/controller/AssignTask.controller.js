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
        // _onRouteMatched: function (oEvent) {
        //   const oArgs = oEvent.getParameter("arguments").taskData;
        //   var oModel = this.getView().getModel("TaskModel").getData()[
        //     parseInt(oArgs)
        //   ];
        //   var AssignModel = new JSONModel(oModel);
        //   this.getView().setModel(AssignModel, "AssignModel");

        //   // this._fetchCommonData("AssignedTask", "AssignModel", {
        //   //   TaskID: oArgs,
        //   // });

        //   // if (oArgs && oArgs.taskData) {
        //   //   try {
        //   //     const taskData = JSON.parse(decodeURIComponent(oArgs.taskData));
        //   //     const taskModel = new JSONModel(taskData);
        //   //     this.getView().setModel(taskModel, "taskAssigned");

        //   //     // Use TaskID instead
        //   //     if (taskData.TaskID) {
        //   //       this.CommonReadcall({ TaskID: taskData.TaskID });
        //   //     } else {
        //   //       MessageToast.show("TaskID missing.");
        //   //     }
        //   //   } catch (err) {
        //   //     console.error("Parse error", err);
        //   //   }
        //   // }
        //   this.readCallForAllLoginDetails();
        // },
        _onRouteMatched: function (oEvent) {
          const sTaskID = oEvent.getParameter("arguments").taskID;

          // Fetch task details for ObjectHeader
          this._fetchTaskDetails(sTaskID);

          // Fetch assigned tasks for table
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
              let loginData = Array.isArray(oData.data)
                ? oData.data
                : [oData.data];

              // Set full data model
              this.getView().setModel(
                new JSONModel(loginData),
                "LoginDetailsModel"
              );

              // If "Initial", filter unique entries by LoginID or another field
              if (filter === "Initial") {
                const uniqueLoginData = [
                  ...new Map(
                    loginData
                      .filter(
                        (item) => item.LoginID && item.LoginID.trim() !== ""
                      )
                      .map((item) => [item.LoginID.trim(), item])
                  ).values(),
                ];

                this.getView().setModel(
                  new JSONModel(uniqueLoginData),
                  "AllLoginDetailsModelInitial"
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
          const oVisibleModel = new JSONModel({ save: false, submit: true });
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

            const oData = oSelectedItem
              .getBindingContext("AssignModel")
              .getObject();
            this._originalTaskData = JSON.parse(JSON.stringify(oData)); // deep copy
            oModel = new JSONModel(oData);
          } else {
            this._originalTaskData = null;
            const newTaskData = {
              EmployeeID: "",
              EmployeeName: "",
              HoursWorked: "",
              TaskName: "",
              StartDate: "",
              EndDate: "",
            };
            oModel = new JSONModel(newTaskData);
          }

          oView.setModel(oModel, "EditTaskModel");

          if (!this.oTaskDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.AssignTask", // your fragment path
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
          var aFilterItems = this.byId("AT_id_FilterBar").getFilterGroupItems();
          var params = {};
          aFilterItems.forEach(function (oItem) {
            var oControl = oItem.getControl();
            var sValue = oItem.getName();
            if (oControl && oControl.getValue()) {
              params[sValue] = oControl.getValue();
            }
          });
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
              const taskData = Array.isArray(response.data)
                ? response.data
                : [response.data];
              this.getView().setModel(new JSONModel(taskData), "AssignModel");
            }
          } catch (error) {
            MessageToast.show("Error loading assigned tasks");
          }
        },

        //Submit the task details
        FAT_onSubmitTask: async function () {
          const oData = this.getView().getModel("EditTaskModel").getData();
          // Validate all fields
          if (
            utils._LCvalidationComboBox(
              sap.ui.getCore().byId("FAT_id_EmployeeID"),
              "ID"
            ) &&
            utils._LCvalidateDate(
              sap.ui.getCore().byId("FAT_id_StartDate"),
              "ID"
            ) &&
            utils._LCvalidateDate(
              sap.ui.getCore().byId("FAT_id_EndDate"),
              "ID"
            ) &&
            utils._LCvalidateMandatoryField(
              sap.ui.getCore().byId("FAT_id_HoursWorked"),
              "ID"
            )
          ) {
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            return;
          }
          // Get selected employee IDs
          const employeeIDs = sap.ui
            .getCore()
            .byId("FAT_id_EmployeeID")
            .getSelectedKeys()
            .filter((key) => key.trim() !== "");
          oData.EmployeeID = employeeIDs.join(",");

          // You can format hours if needed
          oData.HoursWorked = sap.ui
            .getCore()
            .byId("FAT_id_HoursWorked")
            .getValue();
          oData.TaskName = sap.ui.getCore().byId("FAT_id_TaskName").getValue();
          oData.StartDate = sap.ui
            .getCore()
            .byId("FAT_id_StartDate")
            .getValue();
          oData.EndDate = sap.ui.getCore().byId("FAT_id_EndDate").getValue();

          // Save to backend
          const response = await this.ajaxCreateWithJQuery("AssignedTask", {
            data: oData,
          });

          if (response.success === true) {
            MessageToast.show("Task Assigned successfully!");

            this._fetchCommonData("AssignedTask", "AssignModel", {});

            this.oTaskDialog.close();
          } else {
            MessageToast.show("Failed to Assign task.");
          }
        },
        MA_onPressSave: async function () {
          const oTable = this.byId("AT_id_TaskTable");
          const oSelectedItem = oTable.getSelectedItem();

          if (!oSelectedItem) {
            MessageToast.show("Please select a task to update.");
            return;
          }

          const oData = this.getView().getModel("EditTaskModel").getData();
          const sTaskId = oSelectedItem
            .getBindingContext("AssignModel")
            .getProperty("ID");

          const requestData = { filters: { ID: sTaskId }, data: oData };

          const response = await this.ajaxUpdateWithJQuery(
            "/AssignedTask",
            requestData
          );

          if (response.success === true) {
            MessageToast.show("Task updated successfully!");
            this.oTaskDialog.close();
            this._fetchCommonData("AssignedTask", "AssignModel", {});
          } else {
            MessageToast.show("Failed to update task.");
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
