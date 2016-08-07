/**
 * Главное окно интерфейса
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2016
 */

// Назначим обработчики событий
$p.on({

	/**
	 * ### При установке параметров сеанса
	 * Процедура устанавливает параметры работы программы, специфичные для текущей сборки
	 *
	 * @param prm {Object} - в свойствах этого объекта определяем параметры работы программы
	 * @param modifiers {Array} - сюда можно добавить обработчики, переопределяющие функциональность объектов данных
	 */
	settings: function (prm) {

		prm.guests = [{
			username: "Алгоритм",
			password: "hQI7OhIGlVeOWi8="
		}];

		prm.__define({

			// фильтр для репликации с CouchDB - режем заказы по контрагенту
			pouch_filter: {
				value: (function () {
					var filter = {};
					filter.__define({
						doc: {
							value: "auth/by_partner",
							writable: false
						}
					});
					return filter;
				})(),
				writable: false
			}

		});
	},

	/**
	 * ### При инициализации интерфейса
	 * Вызывается после готовности DOM и установки параметров сеанса
	 *
	 */
	iface_init: function() {

		// используем стандартный сайдбар, в который передаём списки закладок и кнопок
		// первый параметр - список закладок
		// второй параметр - список кнопок дополнительной навигации
		$p.iface.init_sidebar(
			[
				{id: "doc", text: "Заказы", icon: "projects_48.png"},
				{id: "settings", text: "Настройки", icon: "settings_48.png"},
				{id: "about", text: "О программе", icon: "about_48.png"}
			],
			[
				{name: 'about', text: '<i class="fa fa-info-circle md-fa-lg"></i>', tooltip: 'О программе', float: 'right'},
				{name: 'settings', text: '<i class="fa fa-cog md-fa-lg"></i>', tooltip: 'Настройки', float: 'right'},
				{name: 'doc', text: '<i class="fa fa-suitcase md-fa-lg"></i>', tooltip: 'Заказы', float: 'right'},
				{name: 'sep_0', text: '', float: 'right'},
				{name: 'sync', text: '', float: 'right'},
				{name: 'auth', text: '', width: '80px', float: 'right'}

			]
		);

	}

});
