/**
 * ### Модуль Ценообразование
 * Содержит методы для работы с ценами номенклатуры
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 */

$p.modifiers.push(
	function($p){

		// экспортируем класс Pricing (модуль ценообразования)
		$p.pricing = new Pricing($p);

		// методы ценообразования в прототип номенклатуры
		$p.cat.nom._obj_constructor.prototype.__define({

			/**
			 * ### Возвращает цену номенклатуры указанного типа
			 * - на дату
			 * - с подбором характеристики по цвету
			 * - с пересчетом из валюты в валюту
			 *
			 * @method _price
			 * @for $p.cat.nom
			 *
			 * @example
			 *     // установим цену в строке документа
			 *     row.price = row.nom._price({
			 *			price_type: this.doc_price_type,
			 *			characteristic: row.characteristic,
			 *			date: this.date,
			 *			currency: this.doc_currency
			 *		});
			 */
			_price: {
				value: function (attr) {
					
					if(!attr)
						attr = {};

					if(!attr.price_type)
						attr.price_type = $p.job_prm.pricing.price_type_sale;
					else if($p.utils.is_data_obj(attr.price_type))
						attr.price_type = attr.price_type.ref;

					if(!attr.characteristic)
						attr.characteristic = $p.utils.blank.guid;
					else if($p.utils.is_data_obj(attr.characteristic))
						attr.characteristic = attr.characteristic.ref;

					if(!attr.date)
						attr.date = new Date();

					var price = 0, currency, date = $p.utils.blank.date;

					if(this._data._price){
						if(this._data._price[attr.characteristic]){
							if(this._data._price[attr.characteristic][attr.price_type]){
								this._data._price[attr.characteristic][attr.price_type].forEach(function (row) {
									if(row.date > date && row.date <= attr.date){
										price = row.price;
										currency = row.currency;
									}
								})
							}
						}else if(attr.characteristic != $p.utils.blank.guid && this._data._price[$p.utils.blank.guid]){
							// если нет цены с характеристикой, возвращаем цену без характеристики
							if(this._data._price[$p.utils.blank.guid][attr.price_type]){
								this._data._price[$p.utils.blank.guid][attr.price_type].forEach(function (row) {
									if(row.date > date && row.date <= attr.date){
										price = row.price;
										currency = row.currency;
									}
								})
							}
						}
					}

					// Пересчитать из валюты в валюту
					return $p.pricing.from_currency_to_currency(price, attr.date, currency, attr.currency);

				}
			}
		});


		function Pricing($p){

			/**
			 * ### Пересчитывает сумму из валюты в валюту
			 *
			 * @method from_currency_to_currency
			 * @param amount {Number} - сумма к пересчету
			 * @param date {Date} - дата курса
			 * @param from - исходная валюта
			 * @param [to] - конечная валюта
			 * @return {Number}
			 */
			this.from_currency_to_currency = function (amount, date, from, to) {

				if(!to || to.empty())
					to = $p.job_prm.pricing.main_currency;
				
				if(!from || from == to)
					return amount;
				
				if(!date)
					date = new Date();

				if(!this.cource_sql)
					this.cource_sql = $p.wsql.alasql.compile("select top 1 * from `ireg_currency_courses` where `currency` = ? and `period` <= ? order by `date` desc");

				var cfrom = {course: 1, multiplicity: 1}, 
					cto = {course: 1, multiplicity: 1},
					tmp;
				if(from != $p.job_prm.pricing.main_currency){
					tmp = this.cource_sql([from.ref, date]);
					if(tmp.length)
						cfrom = tmp[0];
				}
				if(to != $p.job_prm.pricing.main_currency){
					tmp = this.cource_sql([to.ref, date]);
					if(tmp.length)
						cto = tmp[0];
				}

				return (amount * cfrom.course / cfrom.multiplicity) * cto.multiplicity / cto.course;
			};


			// виртуальный срез последних
			function build_cache() {

				return $p.doc.nom_prices_setup.pouch_db.query("doc/doc_nom_prices_setup_slice_last",
					{
						limit : 1000,
						include_docs: false,
						startkey: [''],
						endkey: ['\uffff']
						// ,reduce: function(keys, values, rereduce) {
						// 	return values.length;
						// }
					})
					.then(function (res) {
						res.rows.forEach(function (row) {

							var onom = $p.cat.nom.get(row.key[0], false, true);

							if(!onom || !onom._data)
								return;
							
							if(!onom._data._price)
								onom._data._price = {};

							if(!onom._data._price[row.key[1]])
								onom._data._price[row.key[1]] = {};

							if(!onom._data._price[row.key[1]][row.key[2]])
								onom._data._price[row.key[1]][row.key[2]] = [];

							onom._data._price[row.key[1]][row.key[2]].push({
								date: new Date(row.value.date),
								price: row.value.price,
								currency: $p.cat.currencies.get(row.value.currency)
							});

						});
					});
			}

			$p.on({

				// подписываемся на событие после загрузки из pouchdb-ram и готовности предопределенных
				predefined_elmnts_inited: function predefined_elmnts_inited() {
					$p.off(predefined_elmnts_inited);
					build_cache();
				},

				// следим за изменениями документа установки цен, чтобы при необходимости обновить кеш
				pouch_change: function (dbid, change) {
					if (dbid != $p.doc.nom_prices_setup.cachable)
						return;

					// формируем новый
				}

			});

		}

	}
);
